from flask import Blueprint, request, jsonify
from app.database.mongodb import get_db
from app.middleware import token_required, role_required
import uuid
import datetime

opportunities_bp = Blueprint('opportunities', __name__)

@opportunities_bp.route('/opportunities', methods=['POST'])
@token_required
@role_required('Employer')
def create_opportunity(current_user):
    db = get_db()
    data = request.json or {}
    candidate_id = data.get('candidateId')
    project_name = data.get('projectName')
    role = data.get('role')
    
    if not candidate_id or not project_name:
        return jsonify({'error': 'Candidate ID and Project Name are required.'}), 400
        
    opp_id = f"OPP-{uuid.uuid4().hex[:8].upper()}"
    org_id = current_user.get('profileId')
    org = db.organizations.find_one({"id": org_id})
    company_name = org.get("company_name", "Employer") if org else "Employer"
    new_opp = {
        "id": opp_id,
        "employer_id": org_id,
        "employer_name": company_name,
        "candidate_id": candidate_id,
        "project_name": project_name,
        "role": role,
        "status": "Pending",
        "created_at": datetime.datetime.utcnow()
    }
    
    db.opportunities.insert_one(new_opp)
    
    # Remove _id before returning
    new_opp.pop('_id', None)
    return jsonify(new_opp), 201

@opportunities_bp.route('/opportunities', methods=['GET'])
@token_required
@role_required('Professional')
def get_candidate_opportunities(current_user):
    db = get_db()
    candidate_id = current_user.get('professionalId')
    
    opportunities = list(db.opportunities.find({"candidate_id": candidate_id}))
    for opp in opportunities:
        opp.pop('_id', None)
        
    return jsonify(opportunities), 200

@opportunities_bp.route('/opportunities/<id>/accept', methods=['POST'])
@token_required
@role_required('Professional')
def accept_opportunity(current_user, id):
    db = get_db()
    candidate_id = current_user.get('professionalId')
    
    opp = db.opportunities.find_one({"id": id, "candidate_id": candidate_id})
    if not opp:
        return jsonify({'error': 'Opportunity not found.'}), 404
        
    db.opportunities.update_one({"id": id}, {"$set": {"status": "Accepted"}})
    
    # Update candidate status
    db.candidates.update_one(
        {"id": candidate_id},
        {"$set": {"status": "Engaged"}}
    )
    
    # Update project member status
    project_id = opp.get('project_id')
    if project_id:
        db.projects.update_one(
            {"id": project_id, "members.id": candidate_id},
            {"$set": {"members.$.status": "Joined"}}
        )
        # Check if all members accepted. If so, make project Active
        proj = db.projects.find_one({"id": project_id})
        if proj:
            members = proj.get('members', [])
            all_joined = all(m.get('status') == 'Joined' for m in members)
            if all_joined:
                db.projects.update_one({"id": project_id}, {"$set": {"status": "Active"}})
    else:
        # Fallback to old behavior
        project = db.projects.find_one({"name": opp['project_name']})
        if project:
            candidate = db.candidates.find_one({"id": candidate_id})
            member = {
                "id": candidate['id'],
                "name": candidate['name'],
                "role": opp['role'] or candidate.get('title', 'Engineer'),
                "status": "Joined"
            }
            db.projects.update_one(
                {"id": project['id']},
                {"$push": {"members": member}}
            )
    
    return jsonify({"message": "Opportunity accepted."}), 200

@opportunities_bp.route('/opportunities/<id>/reject', methods=['POST'])
@token_required
@role_required('Professional')
def reject_opportunity(current_user, id):
    db = get_db()
    candidate_id = current_user.get('professionalId')
    
    opp = db.opportunities.find_one({"id": id, "candidate_id": candidate_id})
    if not opp:
        return jsonify({'error': 'Opportunity not found.'}), 404
        
    db.opportunities.update_one({"id": id}, {"$set": {"status": "Rejected"}})
    
    return jsonify({"message": "Opportunity rejected."}), 200

@opportunities_bp.route('/opportunities/request', methods=['POST'])
@token_required
@role_required('Professional')
def request_opportunity(current_user):
    db = get_db()
    data = request.json or {}
    job_id = data.get('jobId')
    
    if not job_id:
        return jsonify({'error': 'Job ID is required.'}), 400
        
    job = db.job_postings.find_one({"$or": [{"job_id": job_id}, {"_id": job_id}]})
    if not job:
        return jsonify({'error': 'Job not found.'}), 404
        
    candidate_id = current_user.get('professionalId')
    
    # Check if request already exists
    existing = db.opportunities.find_one({
        "candidate_id": candidate_id,
        "job_id": str(job.get('_id', job_id))
    })
    
    if existing:
        return jsonify({'error': 'You have already requested this opportunity.'}), 400
        
    opp_id = f"REQ-{uuid.uuid4().hex[:8].upper()}"
    new_req = {
        "id": opp_id,
        "employer_id": job.get('employer_id'), # might be null for scraped jobs
        "employer_name": job.get('company', 'Unknown'),
        "candidate_id": candidate_id,
        "project_name": job.get('title', 'Project'),
        "role": job.get('role', job.get('title', 'Role')),
        "job_id": str(job.get('_id', job_id)),
        "status": "Candidate_Requested",
        "created_at": datetime.datetime.utcnow()
    }
    
    db.opportunities.insert_one(new_req)
    new_req.pop('_id', None)
    return jsonify(new_req), 201


@opportunities_bp.route('/opportunities/employer', methods=['GET'])
@token_required
@role_required(['Employer', 'Admin'])
def get_employer_opportunities(current_user):
    """Return all opportunities where this employer is involved.
    Includes: invitations sent (Pending), accepted, rejected, and candidate-requested.
    """
    db = get_db()
    employer_id = current_user.get('profileId')

    opps = list(db.opportunities.find(
        {"employer_id": employer_id},
        {"_id": 0}
    ))

    # Enrich with candidate name for display
    for opp in opps:
        cand = db.candidates.find_one({"id": opp.get("candidate_id")}, {"name": 1, "role": 1, "target_role": 1, "readiness_score": 1, "_id": 0})
        if cand:
            opp["candidate_name"] = cand.get("name", "Unknown")
            opp["candidate_role"] = cand.get("role") or cand.get("target_role", "")
            opp["candidate_readiness"] = cand.get("readiness_score", 0)

    return jsonify(opps), 200


@opportunities_bp.route('/opportunities/<id>/approve', methods=['POST'])
@token_required
@role_required(['Employer', 'Admin'])
def approve_candidate_request(current_user, id):
    """Employer approves a candidate-requested opportunity."""
    db = get_db()
    employer_id = current_user.get('profileId')

    opp = db.opportunities.find_one({"id": id, "employer_id": employer_id})
    if not opp:
        # Also check by looking up without employer_id (for candidate-initiated requests)
        opp = db.opportunities.find_one({"id": id})
        if not opp:
            return jsonify({'error': 'Opportunity not found.'}), 404

    db.opportunities.update_one({"id": id}, {"$set": {"status": "Accepted", "employer_id": employer_id}})

    # Mark candidate as Engaged
    db.candidates.update_one(
        {"id": opp.get("candidate_id")},
        {"$set": {"status": "Engaged"}}
    )
    return jsonify({"message": "Candidate request approved."}), 200
