from flask import Blueprint, request, jsonify
from app.repositories import JobPostingsRepository
from app.services import groq_service
from app.middleware import token_required

jobs_bp = Blueprint('jobs', __name__)


@jobs_bp.route('/job-postings', methods=['GET'])
@token_required
def list_jobs(current_user):
    try:
        skill    = request.args.get('skill', '').strip() or None
        location = request.args.get('location', '').strip() or None
        title    = request.args.get('title', '').strip() or None
        page     = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))

        result = JobPostingsRepository.search(
            skill_filter=skill,
            location=location,
            title_query=title,
            page=page,
            per_page=per_page,
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@jobs_bp.route('/job-postings/<job_id>', methods=['GET'])
@token_required
def get_job(current_user, job_id):
    try:
        job = JobPostingsRepository.get_by_id(job_id)
        if not job:
            return jsonify({'error': 'Job not found.'}), 404
        return jsonify(job)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@jobs_bp.route('/job-postings/market-insights', methods=['GET'])
@token_required
def market_insights(current_user):
    """Return top in-demand skills with a Groq-generated market narrative."""
    try:
        top_skills = JobPostingsRepository.get_top_skills(limit=10)
        insight    = groq_service.analyze_skill_demand(top_skills)
        return jsonify({
            'top_skills': top_skills,
            'market_insight': insight,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
