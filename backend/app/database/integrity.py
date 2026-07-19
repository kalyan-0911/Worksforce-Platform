import logging
from bson.objectid import ObjectId

logger = logging.getLogger(__name__)

def run_database_integrity_audit(db):
    """
    Runs a full database integrity validation scan as specified in the database contract.
    Returns a dictionary containing:
      - 'issues': list of string descriptions of any broken relationships/inconsistencies
      - 'integrity_score': float score from 0.0 to 100.0
      - 'checked_counts': dict of collections and count of documents checked
    """
    issues = []
    checked = {
        "users": 0,
        "candidates": 0,
        "organizations": 0,
        "requisitions": 0,
        "projects": 0,
        "opportunities": 0
    }
    
    # 1. Load all required collections in single queries to prevent N+1 network lookups
    users = list(db.users.find())
    candidates = list(db.candidates.find())
    organizations = list(db.organizations.find())
    requisitions = list(db.requisitions.find())
    projects = list(db.projects.find())
    opportunities = list(db.opportunities.find())

    # Set checked counts
    checked["users"] = len(users)
    checked["candidates"] = len(candidates)
    checked["organizations"] = len(organizations)
    checked["requisitions"] = len(requisitions)
    checked["projects"] = len(projects)
    checked["opportunities"] = len(opportunities)

    # Build memory lookup maps
    users_by_id = {str(u["_id"]): u for u in users}
    candidates_by_id = {c["id"]: c for c in candidates}
    organizations_by_id = {o["id"]: o for o in organizations}
    projects_by_id = {p["id"]: p for p in projects}

    # 2. Check for Duplicate User Emails
    emails = {}
    for user in users:
        email = user.get("email")
        if email:
            email_lower = email.lower().strip()
            if email_lower in emails:
                issues.append(f"Duplicate email found in users: {email} (User IDs: {user['_id']} and {emails[email_lower]})")
            else:
                emails[email_lower] = user["_id"]

    # 3. Check for Duplicate Candidate IDs or Emails
    cand_ids = set()
    cand_emails = set()
    for cand in candidates:
        cid = cand.get("id")
        email = cand.get("email")
        
        if cid:
            if cid in cand_ids:
                issues.append(f"Duplicate Candidate ID found: {cid}")
            cand_ids.add(cid)
            
        if email:
            email_lower = email.lower().strip()
            if email_lower in cand_emails:
                issues.append(f"Duplicate email in candidates: {email}")
            cand_emails.add(email_lower)

        # Candidate user link validation
        user_id_str = cand.get("user_id")
        if not user_id_str:
            issues.append(f"Candidate {cid} is missing user_id reference.")
            continue
            
        user = users_by_id.get(user_id_str)
        if not user:
            issues.append(f"Candidate profile {cid} references missing user {user_id_str}")
        elif user.get("profile_id") != cid:
            issues.append(f"User {user['_id']} profile link '{user.get('profile_id')}' does not match candidate '{cid}'")

    # 4. Check for Duplicate Organization IDs
    org_ids = set()
    for org in organizations:
        oid = org.get("id")
        if oid:
            if oid in org_ids:
                issues.append(f"Duplicate Organization ID found: {oid}")
            org_ids.add(oid)

        # Organization user link validation
        user_id_str = org.get("user_id")
        if user_id_str:  # Unclaimed organizations might have user_id: None
            user = users_by_id.get(user_id_str)
            if not user:
                issues.append(f"Organization {oid} references missing user {user_id_str}")
            elif user.get("profile_id") != oid:
                issues.append(f"User {user['_id']} profile link '{user.get('profile_id')}' does not match organization '{oid}'")

    # 5. Check Requisitions organization links
    for req in requisitions:
        req_id = req.get("id")
        org_id = req.get("organization_id")
        if not org_id:
            issues.append(f"Requisition {req_id} is missing organization_id reference.")
            continue
            
        org = organizations_by_id.get(org_id)
        if not org:
            issues.append(f"Requisition {req_id} references missing organization {org_id}")

    # 6. Check Projects organization and member links
    for proj in projects:
        proj_id = proj.get("id")
        org_id = proj.get("organization_id")
        if not org_id:
            issues.append(f"Project {proj_id} is missing organization_id reference.")
            continue
            
        org = organizations_by_id.get(org_id)
        if not org:
            issues.append(f"Project {proj_id} references missing organization {org_id}")
            
        for m in proj.get("members", []):
            m_id = m.get("id")
            if not m_id:
                issues.append(f"Project {proj_id} contains member without id.")
                continue
                
            cand = candidates_by_id.get(m_id)
            if not cand:
                issues.append(f"Project {proj_id} references missing candidate member {m_id}")

    # 7. Check Opportunity relationships
    for opp in opportunities:
        opp_id = opp.get("id")
        cand_id = opp.get("candidate_id")
        employer_id = opp.get("employer_id")
        project_id = opp.get("project_id")
        
        if cand_id:
            cand = candidates_by_id.get(cand_id)
            if not cand:
                issues.append(f"Opportunity {opp_id} references missing candidate {cand_id}")
                
        if employer_id:
            org = organizations_by_id.get(employer_id)
            if not org:
                issues.append(f"Opportunity {opp_id} references missing organization/employer {employer_id}")
                
        if project_id:
            proj = projects_by_id.get(project_id)
            if not proj:
                issues.append(f"Opportunity {opp_id} references missing project {project_id}")

    # Compute Integrity Score
    if len(issues) == 0:
        integrity_score = 100.0
    else:
        # Penalty model: subtract 5% per issue down to 0
        integrity_score = max(0.0, 100.0 - (len(issues) * 5.0))

    return {
        "issues": issues,
        "integrity_score": integrity_score,
        "checked_counts": checked
    }

