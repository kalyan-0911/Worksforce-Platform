from flask import Blueprint, request, jsonify
from app.services import AuthService
from app.repositories import CandidateRepository
from app.middleware import token_required

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.json or {}
    email = data.get('email')
    password = data.get('password')
    role = data.get('role')

    if not email or not password or not role:
        return jsonify({'error': 'Email, password, and role are required.'}), 400

    if role not in ['Employer', 'Professional']:
        return jsonify({'error': 'Invalid role.'}), 400

    try:
        res = AuthService.register_user(email, password, role, extra_data=data)
        return jsonify({'message': 'Registration successful.', 'role': res['role'], 'professionalId': res['professionalId']}), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 409
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json or {}
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'Email and password are required.'}), 400

    try:
        res = AuthService.authenticate_user(email, password)
        return jsonify(res)
    except PermissionError as e:
        return jsonify({'error': str(e)}), 401
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/me', methods=['GET'])
@token_required
def get_current_user(current_user):
    try:
        prof_id = current_user.get('professionalId')
        candidate = None
        if prof_id:
            candidate = CandidateRepository.get_by_id(prof_id)

        return jsonify({
            'id': current_user.get('id'),
            'email': current_user.get('email'),
            'role': current_user.get('role'),
            'professionalId': prof_id,
            'candidate': candidate
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
