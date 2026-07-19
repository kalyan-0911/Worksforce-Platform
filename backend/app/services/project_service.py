from app.repositories import ProjectRepository, CandidateRepository
from app.database import get_db
import uuid
import datetime

class ProjectService:
    @staticmethod
    def deploy_squad(name, description, member_ids, organization_id):
        if not name or not member_ids:
            raise ValueError("Project name and memberIds are required.")

        db = get_db()
        proj_id = f"PROJ-{uuid.uuid4().hex[:8].upper()}"
        
        member_profiles = []
        for m_id in member_ids:
            c = CandidateRepository.get_by_id(m_id)
            if not c:
                raise ValueError(f"Candidate {m_id} not found.")
                
            member_profiles.append({
                "id": c["id"],
                "name": c["name"],
                "role": c.get('target_role', c.get('role', c.get('title', 'Unknown'))),
                "status": "Pending_Invitation"
            })
            
            # Send an invitation (opportunity) to this candidate
            opp_id = f"REQ-{uuid.uuid4().hex[:8].upper()}"
            db.opportunities.insert_one({
                "id": opp_id,
                "employer_id": organization_id,
                "employer_name": db.organizations.find_one({"id": organization_id}, {"company_name": 1}).get("company_name", "Unknown"),
                "candidate_id": c["id"],
                "project_name": name,
                "project_description": description,
                "project_id": proj_id,
                "role": c.get('target_role', c.get('role', c.get('title', 'Role'))),
                "status": "Pending",
                "created_at": datetime.datetime.utcnow()
            })

        new_project = {
            "id": proj_id,
            "name": name,
            "description": description,
            "size": len(member_ids),
            "status": "Planning",
            "organization_id": organization_id,
            "members": member_profiles,
            "created_at": datetime.datetime.utcnow()
        }
        ProjectRepository.create(new_project)
        return new_project
