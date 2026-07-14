import datetime
from flask import Blueprint, request, jsonify
from app.repositories import AssessmentRepository, CandidateRepository
from app.middleware import token_required

assessments_bp = Blueprint('assessments', __name__)

@assessments_bp.route('/assessments', methods=['GET'])
@token_required
def get_assessments(current_user):
    try:
        rows = AssessmentRepository.get_all()
        for a in rows:
            for q in a.get('questions', []):
                q.pop('answer', None)
        return jsonify(rows)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@assessments_bp.route('/assessments/<id>', methods=['GET'])
@token_required
def get_assessment_by_id(current_user, id):
    try:
        a = AssessmentRepository.get_by_id(id)
        if not a:
            return jsonify({'error': 'Assessment not found.'}), 404
        
        for q in a.get('questions', []):
            q.pop('answer', None)
        return jsonify(a)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@assessments_bp.route('/assessments/<id>/submit', methods=['POST'])
@token_required
def submit_assessment(current_user, id):
    if current_user.get('role') != 'Professional':
        return jsonify({'error': 'Access forbidden.'}), 403

    data = request.json or {}
    user_answers = data.get('answers', [])

    try:
        a = AssessmentRepository.get_by_id(id)
        if not a:
            return jsonify({'error': 'Assessment not found.'}), 404

        questions = a.get('questions', [])
        correct_count = 0
        
        for idx, q in enumerate(questions):
            if idx < len(user_answers) and user_answers[idx] == q.get('answer'):
                correct_count += 1

        total_questions = len(questions)
        score = round((correct_count / total_questions) * 100) if total_questions > 0 else 0
        passed = score >= 80

        prof_id = current_user.get('professionalId')

        # Log submission to MongoDB
        submission_doc = {
            "professional_id": prof_id,
            "assessment_id": id,
            "score": score,
            "completed_at": datetime.datetime.utcnow().isoformat()
        }
        AssessmentRepository.log_submission(submission_doc)

        if passed:
            # Unlock skill badge
            CandidateRepository.add_skill(prof_id, a['skill_name'])
            # Boost readiness score
            CandidateRepository.increment_readiness(prof_id, 5)

        return jsonify({
            'score': score,
            'passed': passed,
            'correctCount': correct_count,
            'totalCount': total_questions
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
