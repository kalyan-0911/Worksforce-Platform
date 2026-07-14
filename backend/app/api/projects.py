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
            member_ids = data.get('memberIds', [])
            
            res = ProjectService.deploy_squad(name, member_ids)
            return jsonify({'message': 'Team successfully deployed.', 'projectId': res['id']}), 201
        else: # GET
            projects = ProjectRepository.get_all()
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
