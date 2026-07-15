from flask import Blueprint, request, jsonify
from app.repositories import ProjectRepository
from app.services import ProjectService, AIService
from app.middleware import token_required, role_required

projects_bp = Blueprint('projects', __name__)

@projects_bp.route('/projects', methods=['GET', 'POST'])
@token_required
def manage_projects(current_user):
    try:
        if request.method == 'POST':
            if current_user.get('role') != 'Employer':
                return jsonify({'error': 'Access forbidden.'}), 403
            
            data = request.json or {}
            name = data.get('name')
            description = data.get('description', '')
            member_ids = data.get('memberIds', [])
            
            res = ProjectService.deploy_squad(name, description, member_ids, current_user['id'])
            return jsonify({'message': 'Team successfully deployed.', 'projectId': res['id']}), 201
        else: # GET
            from app.database import get_db
            projects = list(get_db().projects.find({'organization_id': current_user['id']}, {'_id': 0}))
            
            # Hotfix: Demote older projects stuck in 'Active' state without joined members
            for p in projects:
                if p.get('status') == 'Active':
                    joined = sum(1 for m in p.get('members', []) if m.get('status') == 'Joined')
                    if joined == 0:
                        p['status'] = 'Planning'
                        
            return jsonify(projects)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@projects_bp.route('/projects/recommend-squad', methods=['POST'])
@token_required
@role_required('Employer')
def recommend_squad(current_user):
    data = request.json or {}
    required_roles = data.get('roles', [])

    if not required_roles or not isinstance(required_roles, list):
        return jsonify({'error': 'Roles array is required.'}), 400

    try:
        recommendations = AIService.recommend_squad(required_roles)
        return jsonify(recommendations)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
@projects_bp.route('/projects/<id>', methods=['DELETE'])
@token_required
@role_required('Employer')
def delete_project(current_user, id):
    try:
        from app.database import get_db
        db = get_db()
        
        # Find project first to get name for cascading deletes
        project = db.projects.find_one({'id': id, 'organization_id': current_user['id']})
        if not project:
            return jsonify({'error': 'Project not found or unauthorized.'}), 404
            
        project_name = project.get('name')
        
        # Delete the project
        db.projects.delete_one({'id': id})
        
        if project_name:
            # Delete corresponding requisitions (Drafts or otherwise)
            db.requisitions.delete_many({'project_name': project_name, 'organization_id': current_user['id']})
            
            # Find candidates tied to these opportunities
            opps = list(db.opportunities.find({'project_name': project_name, 'employer_id': current_user['id']}))
            candidate_ids = list(set([opp.get('candidate_id') for opp in opps if opp.get('candidate_id')]))
            
            # Delete the opportunities
            db.opportunities.delete_many({'project_name': project_name, 'employer_id': current_user['id']})
            
            # Revert candidate status if they have no other accepted opportunities
            for cid in candidate_ids:
                remaining_accepted = db.opportunities.find_one({'candidate_id': cid, 'status': 'Accepted'})
                if not remaining_accepted:
                    db.candidates.update_one({'id': cid}, {'$set': {'status': 'Bench'}})
                    db.professionals.update_one({'id': cid}, {'$set': {'status': 'Bench'}})
                    
        return jsonify({'message': 'Project and associated records deleted successfully.'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
