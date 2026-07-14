from flask import Blueprint, jsonify
from app.database import get_db
from app.middleware import token_required

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('/analytics', methods=['GET'])
@token_required
def get_analytics(current_user):
    try:
        db = get_db()
        
        # Marketplace stats
        total_talent = db.candidates.count_documents({"user_id": None})
        bench_count = db.candidates.count_documents({"user_id": None, "status": "Bench"})
        jobs_count = db.job_postings.count_documents({"employer_id": None})
        org_count = db.organizations.count_documents({"user_id": None})
        
        util_rate = round(((total_talent - bench_count) / total_talent) * 100, 1) if total_talent else 0.0

        # Workspace stats
        user_id = current_user['id']
        my_active_proj = db.projects.count_documents({"employer_id": user_id, "status": "Active"})
        my_open_reqs = db.requisitions.count_documents({"employer_id": user_id, "status": {"$ne": "Completed"}})
        
        return jsonify({
            "marketplace": {
                "totalTalent": total_talent,
                "benchCount": bench_count,
                "utilizationRate": f"{util_rate}%",
                "totalJobs": jobs_count,
                "totalOrganizations": org_count
            },
            "workspace": {
                "activeProjects": my_active_proj,
                "openRequisitions": my_open_reqs
            },
            "recommendations": []
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
