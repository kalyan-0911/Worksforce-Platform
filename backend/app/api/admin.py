from flask import Blueprint, jsonify
from app.database import get_db
from app.middleware import token_required, role_required

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/admin/dashboard', methods=['GET'])
@token_required
@role_required(['Admin'])
def get_admin_dashboard(current_user):
    try:
        db = get_db()
        return jsonify({
            "overview": {
                "users": db.users.count_documents({}),
                "organizations": db.organizations.count_documents({}),
                "registered_professionals": db.candidates.count_documents({"user_id": {"$ne": None}}),
                "marketplace_professionals": db.candidates.count_documents({"user_id": None}),
                "projects": db.projects.count_documents({}),
                "jobs": db.job_postings.count_documents({}),
                "system_health": "Optimal"
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
