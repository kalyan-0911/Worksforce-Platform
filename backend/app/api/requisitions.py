from flask import Blueprint, request, jsonify
from app.repositories import RequisitionRepository
from app.services import AIService
from app.middleware import token_required, role_required

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

            if not role or not project_name:
                return jsonify({'error': 'Role and Project Name are required.'}), 400

            req_id = f"REQ-{RequisitionRepository.count({}) + 101}"
            new_req = {
                "id": req_id,
                "role": role,
                "project_name": project_name,
                "status": "Draft",
                "required_skills": skills
            }
            RequisitionRepository.create(new_req)
            return jsonify(new_req), 201
        else: # GET
            reqs = RequisitionRepository.get_all()
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
