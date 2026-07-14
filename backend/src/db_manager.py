import sqlite3
import json
import os
import hashlib
import binascii

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'workforcex.db')

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def hash_password(password: str) -> str:
    # PBKDF2 HMAC SHA-256 password hashing (100% compatible locally on Windows)
    salt = "workforcex_secure_salt_string".encode('utf-8')
    dk = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    return binascii.hexlify(dk).decode('utf-8')

def init_db():
    print("Initializing database...")
    conn = get_connection()
    cursor = conn.cursor()

    # 1. Enable foreign keys
    cursor.execute("PRAGMA foreign_keys = ON;")

    # 2. Create tables
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS skills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS professionals (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        status TEXT NOT NULL,
        readiness_score INTEGER NOT NULL
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS professional_skills (
        professional_id TEXT,
        skill_id INTEGER,
        PRIMARY KEY (professional_id, skill_id),
        FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE,
        FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        size INTEGER NOT NULL,
        status TEXT NOT NULL
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS project_members (
        project_id TEXT,
        professional_id TEXT,
        PRIMARY KEY (project_id, professional_id),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS requisitions (
        id TEXT PRIMARY KEY,
        role TEXT NOT NULL,
        project_name TEXT NOT NULL,
        status TEXT NOT NULL,
        match_score TEXT
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS assessments (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        skill_name TEXT NOT NULL,
        questions_json TEXT NOT NULL
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS assessment_submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        professional_id TEXT NOT NULL,
        assessment_id TEXT NOT NULL,
        score INTEGER NOT NULL,
        completed_at TEXT NOT NULL,
        FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE,
        FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS requisition_skills (
        requisition_id TEXT NOT NULL,
        skill_id INTEGER NOT NULL,
        PRIMARY KEY (requisition_id, skill_id),
        FOREIGN KEY (requisition_id) REFERENCES requisitions(id) ON DELETE CASCADE,
        FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('Employer', 'Professional')),
        professional_id TEXT,
        FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE SET NULL
    );
    """)

    conn.commit()
    conn.close()
    print("Database tables validated.")

def _fallback_seeds(cursor, skill_ids):
    # Fallback mock talent data if Excel dataset isn't loaded
    professionals = [
        { 'id': 'PROF-002', 'name': 'John Doe', 'role': 'Staff Front-End Engineer', 'status': 'Engaged', 'readiness_score': 94, 'skills': ['React', 'TypeScript', 'Next.js'] },
        { 'id': 'PROF-003', 'name': 'Alice Smith', 'role': 'ML Research Scientist', 'status': 'Bench', 'readiness_score': 98, 'skills': ['Python', 'PyTorch', 'Transformers', 'Generative AI'] },
        { 'id': 'PROF-004', 'name': 'Bob Johnson', 'role': 'Data Engineer', 'status': 'Engaged', 'readiness_score': 89, 'skills': ['Spark', 'Scala', 'PostgreSQL'] },
        { 'id': 'PROF-005', 'name': 'Diana Prince', 'role': 'Principal Security Analyst', 'status': 'Bench', 'readiness_score': 98, 'skills': ['Security Auditing', 'Cloud Architecture'] },
        { 'id': 'PROF-006', 'name': 'Bruce Wayne', 'role': 'Staff Solutions Engineer', 'status': 'Bench', 'readiness_score': 94, 'skills': ['AWS', 'TypeScript', 'React'] }
    ]
    for p in professionals:
        cursor.execute("INSERT OR IGNORE INTO professionals (id, name, role, status, readiness_score) VALUES (?, ?, ?, ?, ?);",
                       (p['id'], p['name'], p['role'], p['status'], p['readiness_score']))
        for s in p['skills']:
            s_id = skill_ids.get(s)
            if s_id:
                cursor.execute("INSERT OR IGNORE INTO professional_skills (professional_id, skill_id) VALUES (?, ?);", (p['id'], s_id))

def seed_db():
    conn = get_connection()
    cursor = conn.cursor()

    # Check if already seeded
    cursor.execute("SELECT COUNT(*) as count FROM professionals;")
    row = cursor.fetchone()
    if row['count'] > 0:
        print("Database already seeded. Skipping.")
        conn.close()
        return

    print("Checking for raw Excel dataset file...")
    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    excel_path = os.path.join(root_dir, 'Data', 'workforcex dashboard (1).xlsx')

    # Seed core base skills first
    default_skills = [
        'Cloud Architecture', 'AWS', 'Kubernetes', 'Docker',
        'React', 'TypeScript', 'Next.js', 'Vanilla CSS',
        'Python', 'PyTorch', 'Transformers', 'Generative AI',
        'Spark', 'Scala', 'PostgreSQL', 'Security Auditing'
    ]
    skill_ids = {}
    for s in default_skills:
        cursor.execute("INSERT OR IGNORE INTO skills (name) VALUES (?);", (s,))
        cursor.execute("SELECT id FROM skills WHERE name = ?;", (s,))
        skill_ids[s] = cursor.fetchone()['id']

    if os.path.exists(excel_path):
        print(f"Excel dataset found at {excel_path}. Loading talent records...")
        try:
            import openpyxl
            wb = openpyxl.load_workbook(excel_path, read_only=True)
            ws = wb['Employee datas']
            
            rows_iter = ws.iter_rows(min_row=2, values_only=True)
            inserted_count = 0

            # Wrap in transaction for high-performance batch operations
            for r in rows_iter:
                if not r or r[0] is None:
                    continue
                
                first_name = r[0]
                last_name = r[1]
                role = r[4] or 'Production Technician I'
                email = r[6] or f"{first_name.lower()}.{last_name.lower()}@bilearner.com"
                rating = r[24] or 3
                emp_id = r[25] or inserted_count
                
                name = f"{first_name} {last_name}"
                prof_id = f"PROF-{emp_id}"
                
                # Distribute statuses across the dataset
                status = 'Bench'
                if inserted_count % 8 == 0:
                    status = 'Engaged'
                
                readiness = 65 + (rating * 7)
                if readiness > 100: readiness = 100

                # Insert professional
                cursor.execute(
                    "INSERT INTO professionals (id, name, role, status, readiness_score) VALUES (?, ?, ?, ?, ?);",
                    (prof_id, name, role, status, readiness)
                )

                # Dynamically assign skill associations
                candidate_skills = []
                role_lower = role.lower()
                if 'technician' in role_lower or 'production' in role_lower:
                    candidate_skills = ['AWS', 'Docker', 'PostgreSQL']
                elif 'sales' in role_lower or 'manager' in role_lower:
                    candidate_skills = ['Cloud Architecture', 'Security Auditing', 'PostgreSQL']
                elif 'ml' in role_lower or 'scientist' in role_lower or 'data' in role_lower:
                    candidate_skills = ['Python', 'PyTorch', 'Transformers', 'Generative AI', 'Spark']
                elif 'developer' in role_lower or 'engineer' in role_lower:
                    candidate_skills = ['React', 'TypeScript', 'Next.js', 'Vanilla CSS', 'Docker']
                else:
                    candidate_skills = ['TypeScript', 'Docker', 'PostgreSQL']

                for sname in candidate_skills:
                    s_id = skill_ids.get(sname)
                    if s_id:
                        cursor.execute("INSERT OR IGNORE INTO professional_skills (professional_id, skill_id) VALUES (?, ?);", (prof_id, s_id))

                # Auto-register portal login accounts for all candidates
                hashed_pwd = hash_password('password123')
                cursor.execute(
                    "INSERT OR IGNORE INTO users (email, password_hash, role, professional_id) VALUES (?, ?, ?, ?);",
                    (email, hashed_pwd, 'Professional', prof_id)
                )

                inserted_count += 1

            # Seed default admin user
            cursor.execute("INSERT OR IGNORE INTO users (email, password_hash, role, professional_id) VALUES (?, ?, ?, ?);",
                           ('employer@workforcex.com', hash_password('password123'), 'Employer', None))
            # Seed Sarah Connor as a specific candidate we track in portal
            cursor.execute("INSERT OR IGNORE INTO professionals (id, name, role, status, readiness_score) VALUES (?, ?, ?, ?, ?);",
                           ('PROF-001', 'Sarah Connor', 'Solutions Architect', 'Bench', 96))
            for sname in ['Cloud Architecture', 'AWS', 'Kubernetes']:
                cursor.execute("INSERT OR IGNORE INTO professional_skills (professional_id, skill_id) VALUES (?, ?);", ('PROF-001', skill_ids[sname]))
            cursor.execute("INSERT OR IGNORE INTO users (email, password_hash, role, professional_id) VALUES (?, ?, ?, ?);",
                           ('sarah@workforcex.com', hash_password('password123'), 'Professional', 'PROF-001'))

            # Seed Projects & Requisitions & Skills mappings
            cursor.execute("INSERT INTO projects (id, name, size, status) VALUES (?, ?, ?, ?);", ('PROJ-001', 'Delta Core Dev Team', 2, 'Active'))
            cursor.execute("INSERT INTO project_members (project_id, professional_id) VALUES (?, ?);", ('PROJ-001', 'PROF-001'))

            requisitions = [
                { 'id': 'REQ-102', 'role': 'Staff ML Engineer', 'project_name': 'NeuralCore v2', 'status': 'Matching', 'match_score': '96%' },
                { 'id': 'REQ-103', 'role': 'Lead DevOps Architect', 'project_name': 'CloudScale Migrations', 'status': 'Interviewing', 'match_score': '92%' },
                { 'id': 'REQ-104', 'role': 'Full Stack React Engineer', 'project_name': 'Liquidity Dashboard', 'status': 'Draft', 'match_score': None }
            ]
            for r in requisitions:
                cursor.execute("INSERT INTO requisitions (id, role, project_name, status, match_score) VALUES (?, ?, ?, ?, ?);",
                               (r['id'], r['role'], r['project_name'], r['status'], r['match_score']))

            # Requisition skills
            req_skills = [
                { 'reqId': 'REQ-102', 'skills': ['Python', 'PyTorch', 'Transformers', 'Generative AI'] },
                { 'reqId': 'REQ-103', 'skills': ['Cloud Architecture', 'AWS', 'Kubernetes', 'Docker'] },
                { 'reqId': 'REQ-104', 'skills': ['React', 'TypeScript', 'Next.js', 'Vanilla CSS'] }
            ]
            for rs in req_skills:
                for sname in rs['skills']:
                    s_id = skill_ids.get(sname)
                    if s_id:
                        cursor.execute("INSERT OR IGNORE INTO requisition_skills (requisition_id, skill_id) VALUES (?, ?);", (rs['reqId'], s_id))

            # Seed Assessments
            assessments = [
                {
                    'id': 'react-arch',
                    'title': 'React Architecture & Patterns',
                    'skill_name': 'React',
                    'questions': [
                        { 'q': 'Which hook should be used to memoize the computed value of an expensive calculation?', 'options': ['useEffect', 'useCallback', 'useMemo', 'useRef'], 'answer': 2 },
                        { 'q': 'What is the primary advantage of React\'s concurrent rendering features?', 'options': ['Slightly faster raw render speed', 'Non-blocking UI rendering during large updates', 'Elimination of virtual DOM', 'Direct DOM manipulation'], 'answer': 1 },
                        { 'q': 'In React 18, what does automatic batching do?', 'options': ['Batches state updates in event handlers only', 'Batches state updates across promises, timeouts, and native event handlers', 'Groups components into single files', 'Automates rendering threads'], 'answer': 1 }
                    ]
                },
                {
                    'id': 'python-ds',
                    'title': 'Python Data Science & ML',
                    'skill_name': 'Python',
                    'questions': [
                        { 'q': 'Which library is primarily used for tensor computations and deep learning models in Python?', 'options': ['Pandas', 'Scikit-Learn', 'PyTorch', 'Matplotlib'], 'answer': 2 },
                        { 'q': 'What is the purpose of the \'fit_transform\' method in Scikit-Learn?', 'options': ['Trains a model on data', 'Applies scaling rules to test data only', 'Calculates parameters and transforms the training data in one step', 'Plots regression fits'], 'answer': 2 },
                        { 'q': 'What type of layer is typically used to capture sequential context in modern transformer architectures?', 'options': ['Convolutional Layer', 'Self-Attention Layer', 'Max Pooling Layer', 'Dense Fully-Connected Layer'], 'answer': 1 }
                    ]
                },
                {
                    'id': 'sec-audit',
                    'title': 'Enterprise Security Auditing',
                    'skill_name': 'Security Auditing',
                    'questions': [
                        { 'q': 'Which header is critical to prevent Cross-Site Scripting (XSS) via content injection?', 'options': ['Content-Security-Policy', 'Access-Control-Allow-Origin', 'Strict-Transport-Security', 'Cache-Control'], 'answer': 0 },
                        { 'q': 'What does the principle of least privilege dictate in cloud infrastructure setup?', 'options': ['All users should have admin access to save time', 'Users/roles should only be granted permissions necessary to complete their task', 'Billing accounts must be separate', 'Using simple passwords'], 'answer': 1 },
                        { 'q': 'What is the main threat associated with SQL Injection (SQLi) attacks?', 'options': ['Unauthorized reading or modification of database contents', 'Denial of service via network overload', 'Phishing user credentials', 'Overheating database CPUs'], 'answer': 0 }
                    ]
                }
            ]

            for a in assessments:
                cursor.execute("INSERT INTO assessments (id, title, skill_name, questions_json) VALUES (?, ?, ?, ?);",
                               (a['id'], a['title'], a['skill_name'], json.dumps(a['questions'])))

            conn.commit()
            print(f"Excel dataset loaded successfully! Inserted {inserted_count} talent records.")

        except Exception as e:
            conn.rollback()
            print("Error loading Excel dataset seeds:", str(e))
            _fallback_seeds(cursor, skill_ids)
            conn.commit()
    else:
        print("Excel dataset not found. Running default mock seeder.")
        _fallback_seeds(cursor, skill_ids)
        conn.commit()

    conn.close()

if __name__ == "__main__":
    init_db()
    seed_db()
