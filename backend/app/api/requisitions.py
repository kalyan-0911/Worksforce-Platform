from flask import Blueprint, request, jsonify
from app.repositories import RequisitionRepository
from app.services import AIService
from app.middleware import token_required, role_required
import datetime

requisitions_bp = Blueprint('requisitions', __name__)

@requisitions_bp.route('/requisitions', methods=['GET', 'POST'])
@token_required
def manage_requisitions(current_user):
    try:
        if request.method == 'POST':
            if current_user.get('role') != 'Employer':
                return jsonify({'error': 'Access forbidden.'}), 403
            
            data = request.json or {}
            role = data.get('role')
            project_name = data.get('projectName')
            skills = data.get('skills', [])
            experience = data.get('experience')
            project_description = data.get('projectDescription')
            duration = data.get('duration')
            team_size = data.get('teamSize')

            if not role or not project_name:
                return jsonify({'error': 'Role and Project Name are required.'}), 400

            # Safe cast duration and team_size to comply with JSON Schema validator
            duration_int = None
            if duration is not None:
                try:
                    duration_int = int(duration)
                except ValueError:
                    # If string contains numbers (like "3 months"), try to extract the number
                    import re
                    match = re.search(r'\d+', str(duration))
                    if match:
                        duration_int = int(match.group())
            
            team_size_int = 1
            if team_size is not None:
                try:
                    team_size_int = int(team_size)
                except ValueError:
                    pass

            import uuid
            req_id = f"REQ-{uuid.uuid4().hex[:8].upper()}"
            new_req = {
                "id": req_id,
                "role": role,
                "project_name": project_name,
                "status": "Open",
                "required_skills": skills,
                "organization_id": current_user.get('profileId'),
                "experience": experience,
                "project_description": project_description,
                "duration": duration_int,
                "team_size": team_size_int,
                "created_at": datetime.datetime.utcnow()
            }
            RequisitionRepository.create(new_req)
            
            # Sync to job_postings collection for the Job Market (V2 compatibility)
            try:
                from app.database import get_db
                db = get_db()
                import random
                job_posting = {
                    "job_id": req_id,
                    "title": role,
                    "company": current_user.get('company_name', current_user.get('name', 'WorkForceX Employer')),
                    "location": "Remote",
                    "skills": [s['name'] if isinstance(s, dict) else s for s in skills],
                    "experience_min": 0,
                    "experience_max": 5,
                    "description": project_description,
                    "organization_id": current_user.get('profileId'),
                    "rating": round(random.uniform(3.5, 5.0), 1),
                    "created_at": "Just now"
                }
                db.job_postings.insert_one(job_posting)
            except Exception as e:
                print(f"Failed to sync to job_postings: {e}")

            if "_id" in new_req:
                del new_req["_id"]
            return jsonify(new_req), 201
        else: # GET
            if current_user.get('role') != 'Employer':
                return jsonify({'error': 'Access forbidden.'}), 403
            reqs = RequisitionRepository.get_all({"organization_id": current_user.get('profileId')})
            return jsonify(reqs)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@requisitions_bp.route('/requisitions/<id>/matches', methods=['GET'])
@token_required
@role_required('Employer')
def get_matches(current_user, id):
    try:
        matches = AIService.get_requisition_matches(id)
        return jsonify(matches)
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@requisitions_bp.route('/requisitions/<id>', methods=['DELETE'])
@token_required
@role_required('Employer')
def delete_requisition(current_user, id):
    try:
        from app.database import get_db
        db = get_db()
        
        # 1. Fetch requirement to get project_name
        req = db.requisitions.find_one({'id': id, 'organization_id': current_user.get('profileId')})
        if not req:
            return jsonify({'error': 'Requisition not found or unauthorized.'}), 404
            
        project_name = req.get('project_name')
        
        # 2. Delete the requirement
        db.requisitions.delete_one({'id': id})
        
        if project_name:
            # 3. Delete associated project if it exists (assuming 1:1 mapping by project_name for MVP)
            db.projects.delete_many({'name': project_name, 'organization_id': current_user.get('profileId')})
            
            # 4. Find associated opportunities and Candidates
            opps = list(db.opportunities.find({'project_name': project_name, 'employer_id': current_user.get('profileId')}))
            candidate_ids = list(set([opp.get('candidate_id') for opp in opps if opp.get('candidate_id')]))
            
            # 5. Delete Opportunities
            db.opportunities.delete_many({'project_name': project_name, 'employer_id': current_user.get('profileId')})
            
            # 6. Revert Candidates status
            for cid in candidate_ids:
                remaining_accepted = db.opportunities.find_one({'candidate_id': cid, 'status': 'Accepted'})
                if not remaining_accepted:
                    db.candidates.update_one({'id': cid}, {'$set': {'status': 'Bench'}})
                    db.professionals.update_one({'id': cid}, {'$set': {'status': 'Bench'}})
            
        return jsonify({'message': 'Requirement and associated records deleted successfully.'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
