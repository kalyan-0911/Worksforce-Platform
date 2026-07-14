from functools import wraps
from flask import request, jsonify
import jwt
from app.config import Config

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(" ")[1]
        
        if not token:
            return jsonify({'error': 'Authorization token is missing.'}), 401
        
        try:
            data = jwt.decode(token, Config.JWT_SECRET, algorithms=[Config.JWT_ALGORITHM])
            current_user = data
        except Exception as e:
            return jsonify({'error': 'Token is invalid or expired.'}), 401
        
        return f(current_user, *args, **kwargs)
    return decorated

def role_required(required_role):
    def decorator(f):
        @wraps(f)
        def decorated(current_user, *args, **kwargs):
            if current_user.get('role') != required_role:
                return jsonify({'error': f'Access forbidden: requires {required_role} role.'}), 403
            return f(current_user, *args, **kwargs)
        return decorated
    return decorator
