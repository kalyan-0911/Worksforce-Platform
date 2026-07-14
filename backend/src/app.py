import os
import json
import sqlite3
import datetime
from functools import wraps
from flask import Flask, request, jsonify
from flask_cors import CORS
import jwt

from db_manager import get_connection, hash_password, init_db, seed_db
from ai_engine import ai_engine_instance

app = Flask(__name__)
# Enable CORS for frontend interface communication
CORS(app)

JWT_SECRET = "workforcex_secret_jwt_key_signature"

# Initialize database on startup
init_db()
seed_db()

# --- SECURITY MIDDLEWARE DECORATORS ---

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
            data = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
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


# --- AUTHENTICATION ROUTES ---

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json or {}
    email = data.get('email')
    password = data.get('password')
    role = data.get('role')
    name = data.get('name', 'Anonymous')
    job_role = data.get('job_role', 'Engineer')

    if not email or not password or not role:
        return jsonify({'error': 'Email, password, and role are required.'}), 400

    if role not in ['Employer', 'Professional']:
        return jsonify({'error': 'Invalid role.'}), 400

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM users WHERE email = ?;", (email,))
        if cursor.fetchone():
            return jsonify({'error': 'Email is already registered.'}), 409

        prof_id = None
        if role == 'Professional':
            # Create a professional profile
            cursor.execute("SELECT COUNT(*) as count FROM professionals;")
            count_row = cursor.fetchone()
            next_num = count_row[0] + 1 if count_row else 1
            prof_id = f"PROF-{next_num:03d}"
            cursor.execute(
                "INSERT INTO professionals (id, name, role, status, readiness_score) VALUES (?, ?, ?, ?, ?);",
                (prof_id, name, job_role, 'Bench', 80)
            )
            
        hashed = hash_password(password)
        cursor.execute(
            "INSERT INTO users (email, password_hash, role, professional_id) VALUES (?, ?, ?, ?);",
            (email, hashed, role, prof_id)
        )
        conn.commit()
        return jsonify({'message': 'Registration successful.', 'role': role, 'professionalId': prof_id}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json or {}
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'Email and password are required.'}), 400

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM users WHERE email = ?;", (email,))
        user = cursor.fetchone()
        if not user or user['password_hash'] != hash_password(password):
            return jsonify({'error': 'Invalid email or password.'}), 401

        token = jwt.encode({
            'id': user['id'],
            'email': user['email'],
            'role': user['role'],
            'professional_id': user['professional_id']
        }, JWT_SECRET, algorithm="HS256")

        return jsonify({
            'message': 'Login successful.',
            'token': token,
            'user': {
                'email': user['email'],
                'role': user['role'],
                'professional_id': user['professional_id']
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


# --- TALENT / PROFESSIONAL PORTAL ROUTES ---

@app.route('/api/professionals', methods=['GET'])
@token_required
def get_professionals(current_user):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        # Fetch professionals
        cursor.execute("SELECT * FROM professionals;")
        rows = cursor.fetchall()
        talent_list = []
        for r in rows:
            talent = dict(r)
            # Fetch skills for this professional
            cursor.execute(
                """SELECT s.name FROM skills s
                   JOIN professional_skills ps ON s.id = ps.skill_id
                   WHERE ps.professional_id = ?;""",
                (talent['id'],)
            )
            skills_rows = cursor.fetchall()
            talent['skills'] = [sr['name'] for sr in skills_rows]
            talent_list.append(talent)
        return jsonify(talent_list)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/professionals/<id>/availability', methods=['PATCH'])
@token_required
def toggle_availability(current_user, id):
    # Professionals can only toggle themselves; Employers can toggle anyone
    if current_user.get('role') == 'Professional' and current_user.get('professional_id') != id:
        return jsonify({'error': 'Unauthorized to modify other profiles.'}), 403

    data = request.json or {}
    status = data.get('status')
    if status not in ['Bench', 'Engaged']:
        return jsonify({'error': 'Status must be Bench or Engaged.'}), 400

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE professionals SET status = ? WHERE id = ?;", (status, id))
        conn.commit()
        return jsonify({'message': f'Status updated to {status}.'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


# --- REQUISITION ROUTES ---

@app.route('/api/requisitions', methods=['GET', 'POST'])
@token_required
def manage_requisitions(current_user):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        if request.method == 'POST':
            if current_user.get('role') != 'Employer':
                return jsonify({'error': 'Forbidden: requires Employer role.'}), 403
            
            data = request.json or {}
            role = data.get('role')
            project_name = data.get('project_name')
            status = data.get('status', 'Matching')
            
            if not role or not project_name:
                return jsonify({'error': 'Role and project_name are required.'}), 400

            cursor.execute("SELECT COUNT(*) as count FROM requisitions;")
            count_val = cursor.fetchone()[0]
            next_num = count_val + 101
            req_id = f"REQ-{next_num}"

            cursor.execute(
                "INSERT INTO requisitions (id, role, project_name, status, match_score) VALUES (?, ?, ?, ?, ?);",
                (req_id, role, project_name, status, None)
            )
            conn.commit()
            return jsonify({'message': 'Requisition created.', 'id': req_id}), 201
        
        else: # GET list
            cursor.execute("SELECT * FROM requisitions;")
            rows = cursor.fetchall()
            return jsonify([dict(r) for r in rows])
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/requisitions/<id>/matches', methods=['GET'])
@token_required
@role_required('Employer')
def get_requisition_matches(current_user, id):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM requisitions WHERE id = ?;", (id,))
        requisition_row = cursor.fetchone()
        if not requisition_row:
            return jsonify({'error': 'Requisition not found.'}), 404
        
        requisition = dict(requisition_row)

        cursor.execute(
            """SELECT s.name FROM skills s
               JOIN requisition_skills rs ON s.id = rs.skill_id
               WHERE rs.requisition_id = ?;""",
            (id,)
        )
        required_skills = [row['name'] for row in cursor.fetchall()]

        cursor.execute("SELECT * FROM professionals WHERE status = 'Bench';")
        professionals = cursor.fetchall()

        matches = []
        for p_row in professionals:
            p = dict(p_row)
            cursor.execute(
                """SELECT s.name FROM skills s
                   JOIN professional_skills ps ON s.id = ps.skill_id
                   WHERE ps.professional_id = ?;""",
                (p['id'],)
            )
            candidate_skills = [row['name'] for row in cursor.fetchall()]

            ai_match = ai_engine_instance.compute_match_score(
                candidate_skills,
                p['readiness_score'],
                required_skills
            )

            p['skills'] = candidate_skills
            p['matchScore'] = ai_match['score']
            p['overlappingSkills'] = ai_match['overlappingSkills']
            p['missingSkills'] = ai_match['missingSkills']
            matches.append(p)

        matches.sort(key=lambda x: x['matchScore'], reverse=True)

        return jsonify({
            'requisition': requisition,
            'requiredSkills': required_skills,
            'matches': matches
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


# --- PROJECTS & TEAM BUILDING ROUTES ---

@app.route('/api/projects', methods=['GET', 'POST'])
@token_required
def manage_projects(current_user):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        if request.method == 'POST':
            if current_user.get('role') != 'Employer':
                return jsonify({'error': 'Forbidden: requires Employer role.'}), 403

            data = request.json or {}
            name = data.get('name')
            member_ids = data.get('memberIds', [])

            if not name or not member_ids:
                return jsonify({'error': 'Project name and memberIds are required.'}), 400

            cursor.execute("SELECT COUNT(*) as count FROM projects;")
            count_val = cursor.fetchone()[0]
            next_num = count_val + 1
            proj_id = f"PROJ-{next_num:03d}"

            # Insert project
            cursor.execute(
                "INSERT INTO projects (id, name, size, status) VALUES (?, ?, ?, ?);",
                (proj_id, name, len(member_ids), 'Active')
            )

            # Insert members and flag Engaged
            for m_id in member_ids:
                cursor.execute("INSERT INTO project_members (project_id, professional_id) VALUES (?, ?);", (proj_id, m_id))
                cursor.execute("UPDATE professionals SET status = 'Engaged' WHERE id = ?;", (m_id,))

            conn.commit()
            return jsonify({'message': 'Team successfully deployed.', 'projectId': proj_id}), 201

        else: # GET
            cursor.execute("SELECT * FROM projects;")
            projects_rows = cursor.fetchall()
            projects_list = []
            for pr in projects_rows:
                project = dict(pr)
                # Fetch members
                cursor.execute(
                    """SELECT p.id, p.name, p.role FROM professionals p
                       JOIN project_members pm ON p.id = pm.professional_id
                       WHERE pm.project_id = ?;""",
                    (project['id'],)
                )
                members = [dict(mr) for mr in cursor.fetchall()]
                project['members'] = members
                projects_list.append(project)
            return jsonify(projects_list)
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/projects/recommend-squad', methods=['POST'])
@token_required
@role_required('Employer')
def recommend_squad(current_user):
    data = request.json or {}
    required_roles = data.get('roles', [])

    if not required_roles or not isinstance(required_roles, list):
        return jsonify({'error': 'Roles array is required.'}), 400

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM professionals WHERE status = 'Bench';")
        bench_rows = cursor.fetchall()
        bench_candidates = []

        for r in bench_rows:
            p = dict(r)
            cursor.execute(
                """SELECT s.name FROM skills s
                   JOIN professional_skills ps ON s.id = ps.skill_id
                   WHERE ps.professional_id = ?;""",
                (p['id'],)
            )
            p['skills'] = [sr['name'] for sr in cursor.fetchall()]
            bench_candidates.append(p)

        recommendations = ai_engine_instance.optimize_team_squad(required_roles, bench_candidates)
        return jsonify(recommendations)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


# --- ASSESSMENTS ROUTES ---

@app.route('/api/assessments', methods=['GET'])
@token_required
def get_assessments(current_user):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, title, skill_name, questions_json FROM assessments;")
        rows = cursor.fetchall()
        result = []
        for r in rows:
            a = dict(r)
            # Remove correct answer indices on return to prevent cheating
            clean_questions = []
            for q in json.loads(a['questions_json']):
                q.pop('answer', None)
                clean_questions.append(q)
            a['questions'] = clean_questions
            a.pop('questions_json', None)
            result.append(a)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/assessments/<id>', methods=['GET'])
@token_required
def get_assessment_by_id(current_user, id):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM assessments WHERE id = ?;", (id,))
        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'Assessment not found.'}), 404
        
        a = dict(row)
        clean_questions = []
        for q in json.loads(a['questions_json']):
            q.pop('answer', None)
            clean_questions.append(q)
        a['questions'] = clean_questions
        a.pop('questions_json', None)
        return jsonify(a)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/assessments/<id>/submit', methods=['POST'])
@token_required
@role_required('Professional')
def submit_assessment(current_user, id):
    professional_id = current_user.get('professional_id')
    data = request.json or {}
    answers = data.get('answers', [])

    if not professional_id or not isinstance(answers, list):
        return jsonify({'error': 'Answers array is required.'}), 400

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM assessments WHERE id = ?;", (id,))
        test_row = cursor.fetchone()
        if not test_row:
            return jsonify({'error': 'Assessment not found.'}), 404

        test = dict(test_row)
        original_questions = json.loads(test['questions_json'])
        
        correct_count = 0
        for idx, q in enumerate(original_questions):
            if idx < len(answers) and answers[idx] == q['answer']:
                correct_count += 1

        total_questions = len(original_questions)
        score_percentage = round((correct_count / total_questions) * 100)
        passed = score_percentage >= 80

        # Log attempt
        completed_at = datetime.datetime.utcnow().isoformat()
        cursor.execute(
            "INSERT INTO assessment_submissions (professional_id, assessment_id, score, completed_at) VALUES (?, ?, ?, ?);",
            (professional_id, id, score_percentage, completed_at)
        )

        unlocked_skill = None
        new_readiness = None

        if passed:
            unlocked_skill = test['skill_name']
            
            # Map skill ID
            cursor.execute("SELECT id FROM skills WHERE name = ?;", (unlocked_skill,))
            skill_row = cursor.fetchone()
            s_id = skill_row['id'] if skill_row else None
            if not s_id:
                cursor.execute("INSERT INTO skills (name) VALUES (?);", (unlocked_skill,))
                cursor.execute("SELECT id FROM skills WHERE name = ?;", (unlocked_skill,))
                s_id = cursor.fetchone()['id']

            # Attach verified skill badge
            cursor.execute(
                "INSERT OR IGNORE INTO professional_skills (professional_id, skill_id) VALUES (?, ?);",
                (professional_id, s_id)
            )

        # Recalculate candidate readiness
        cursor.execute(
            "SELECT AVG(score) as avg FROM assessment_submissions WHERE professional_id = ?;",
            (professional_id,)
        )
        avg_score_row = cursor.fetchone()
        if avg_score_row and avg_score_row['avg'] is not None:
            new_readiness = round(avg_score_row['avg'])
            cursor.execute(
                "UPDATE professionals SET readiness_score = ? WHERE id = ?;",
                (new_readiness, professional_id)
            )

        conn.commit()

        return jsonify({
            'message': 'Congratulations! You passed the skills assessment.' if passed else 'Assessment complete. Score did not meet the passing grade.',
            'score': score_percentage,
            'correctAnswers': correct_count,
            'totalQuestions': total_questions,
            'passed': passed,
            'unlockedSkill': unlocked_skill,
            'newReadinessScore': new_readiness
        })

    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


# --- ANALYTICS ROUTES ---

@app.route('/api/analytics', methods=['GET'])
@token_required
def get_analytics_summary(current_user):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        # Active Projects count
        cursor.execute("SELECT COUNT(*) FROM projects WHERE status = 'Active';")
        active_projects = cursor.fetchone()[0]

        # Open Requisitions count
        cursor.execute("SELECT COUNT(*) FROM requisitions WHERE status != 'Closed';")
        open_requisitions = cursor.fetchone()[0]

        # Utilization Rate (percentage of professionals with status = 'Engaged')
        cursor.execute("SELECT COUNT(*) FROM professionals;")
        total_pros = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM professionals WHERE status = 'Engaged';")
        engaged_pros = cursor.fetchone()[0]

        utilization_rate = "0.0%"
        if total_pros > 0:
            utilization_rate = f"{(engaged_pros / total_pros) * 100:.1f}%"

        return jsonify({
            'activeProjects': active_projects,
            'openRequisitions': open_requisitions,
            'utilizationRate': utilization_rate
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
