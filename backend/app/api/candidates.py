from flask import Blueprint, request, jsonify
from app.repositories import CandidateRepository, JobPostingsRepository
from app.services import CandidateService
from app.middleware import token_required

candidates_bp = Blueprint('candidates', __name__)


# ── Talent Inventory ──────────────────────────────────────────

@candidates_bp.route('/professionals', methods=['GET'])
@token_required
def get_professionals(current_user):
    try:
        search_query = request.args.get('search', '').strip()
        role_filter  = request.args.get('role', '').strip()
        skill_filter = request.args.get('skill', '').strip()
        status_filter = request.args.get('status', '').strip()

        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 50))
        skip = (page - 1) * limit

        query = {}
        if search_query:
            query["name"] = {"$regex": search_query, "$options": "i"}
        if role_filter:
            query["role"] = {"$regex": role_filter, "$options": "i"}
        if skill_filter:
            query["skills.name"] = {"$regex": skill_filter, "$options": "i"}
        if status_filter:
            query["status"] = status_filter

        candidates = CandidateRepository.get_all(query, limit=limit, skip=skip)
        return jsonify(candidates)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@candidates_bp.route('/professionals/<id>', methods=['GET', 'PATCH'])
@token_required
def get_professional_by_id(current_user, id):
    try:
        if request.method == 'PATCH':
            if current_user.get('role') == 'Professional' and current_user.get('professionalId') != id:
                return jsonify({'error': 'Unauthorized profile modification.'}), 403
            data = request.json or {}
            CandidateRepository.update(id, data)
            updated = CandidateRepository.get_by_id(id)
            return jsonify(updated)
            
        candidate = CandidateRepository.get_by_id(id)
        if not candidate:
            return jsonify({'error': 'Professional not found.'}), 404
        return jsonify(candidate)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@candidates_bp.route('/candidates/reverse-matches', methods=['GET'])
@token_required
def get_reverse_matches(current_user):
    if current_user.get('role') != 'Professional':
        return jsonify({'error': 'Access forbidden.'}), 403
    
    prof_id = current_user.get('professionalId')
    try:
        from app.services.ai_service import AIService
        matches = AIService.get_reverse_matches(prof_id, top_n=5)
        return jsonify(matches)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@candidates_bp.route('/professionals/<id>/availability', methods=['PATCH'])
@token_required
def toggle_availability(current_user, id):
    if current_user.get('role') == 'Professional' and current_user.get('professionalId') != id:
        return jsonify({'error': 'Unauthorized profile modification.'}), 403

    data = request.json or {}
    new_status = data.get('status')
    if new_status not in ['Bench', 'Engaged', 'Training']:
        return jsonify({'error': 'Invalid status. Must be Bench, Engaged, or Training.'}), 400

    try:
        candidate = CandidateRepository.get_by_id(id)
        if not candidate:
            return jsonify({'error': 'Professional not found.'}), 404
        CandidateRepository.update(id, {"status": new_status})
        return jsonify({'message': 'Status updated.', 'status': new_status})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── Resume Onboarding (Groq AI) ────────────────────────────────

@candidates_bp.route('/candidates/parse-resume', methods=['POST'])
@token_required
def parse_resume(current_user):
    if current_user.get('role') != 'Professional':
        return jsonify({'error': 'Access forbidden.'}), 403

    data = request.json or {}
    resume_text = data.get('resume_text', '').strip()
    if not resume_text:
        return jsonify({'error': 'Resume text is required.'}), 400
    if len(resume_text) < 50:
        return jsonify({'error': 'Resume text is too short. Please paste your full resume.'}), 400

    try:
        prof_id = current_user.get('professionalId')
        result  = CandidateService.process_resume(resume_text, prof_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

import io
from PyPDF2 import PdfReader
import docx

@candidates_bp.route('/candidates/upload-resume', methods=['POST'])
@token_required
def upload_resume(current_user):
    if current_user.get('role') != 'Professional':
        return jsonify({'error': 'Access forbidden.'}), 403

    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded.'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file.'}), 400

    resume_text = ""
    try:
        filename = file.filename.lower()
        if filename.endswith('.pdf'):
            reader = PdfReader(file)
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    resume_text += extracted + "\n"
        elif filename.endswith('.docx'):
            doc = docx.Document(file)
            for para in doc.paragraphs:
                resume_text += para.text + "\n"
        else:
            # Fallback to plain text read
            resume_text = file.read().decode('utf-8', errors='ignore')
            
        if len(resume_text.strip()) < 10:
            return jsonify({'error': 'Could not extract text from file or file is too short.'}), 400
            
        prof_id = current_user.get('professionalId')
        result = CandidateService.process_resume(resume_text, prof_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': f'Failed to process file: {str(e)}'}), 500


# ── Job Recommendations (Skill-Based Matching) ─────────────────

@candidates_bp.route('/candidates/<id>/recommended-jobs', methods=['GET'])
@token_required
def get_recommended_jobs(current_user, id):
    # Professionals can only view their own recommendations
    if current_user.get('role') == 'Professional' and current_user.get('professionalId') != id:
        return jsonify({'error': 'Access forbidden.'}), 403

    try:
        limit = int(request.args.get('limit', 10))
        recommendations = CandidateService.get_job_recommendations(id, limit=limit)
        return jsonify(recommendations)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── Career Path (Groq AI) ─────────────────────────────────────

@candidates_bp.route('/candidates/<id>/career-path', methods=['GET'])
@token_required
def get_career_path(current_user, id):
    if current_user.get('role') == 'Professional' and current_user.get('professionalId') != id:
        return jsonify({'error': 'Access forbidden.'}), 403

    try:
        career_path = CandidateService.get_career_path(id)
        return jsonify(career_path)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
