import os
import hashlib
import binascii
from pymongo import MongoClient, TEXT
from app.config import Config

# Client Singleton Setup
_client = None

def get_client():
    global _client
    if _client is None:
        _client = MongoClient(Config.MONGO_URI)
    return _client

def get_db():
    client = get_client()
    return client[Config.DATABASE_NAME]

def hash_password(password: str) -> str:
    salt = "workforcex_secure_salt_string".encode('utf-8')
    dk = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    return binascii.hexlify(dk).decode('utf-8')

def init_db():
    print(f"Connecting to MongoDB database '{Config.DATABASE_NAME}'...")
    db = get_db()
    
    # Establish performance text and lookup index structures
    try:
        db.users.create_index("email", unique=True)
        db.candidates.create_index("id", unique=True)
        db.candidates.create_index("status")
        try:
            db.candidates.create_index([("name", TEXT), ("role", TEXT)])
        except Exception as e:
            pass # Ignore if index with different name exists
        db.assessments.create_index("id", unique=True)
        db.projects.create_index("id", unique=True)
        db.projects.create_index("organization_id")
        db.requisitions.create_index("id", unique=True)
        db.requisitions.create_index("organization_id")
        db.organizations.create_index("user_id", unique=True)
        print("MongoDB indexes created successfully.")
    except Exception as e:
        print(f"[WARN] Startup database pipeline skipped: {e}")

def _fallback_seeds(db):
    print("Running database seeder fallback mocks...")
    candidates = [
        {
            "id": "PROF-002",
            "name": "John Doe",
            "target_role": "Staff Front-End Engineer",
            "status": "Engaged",
            "readiness_score": 94,
            "skills": [
                { "name": "React", "verified": True },
                { "name": "TypeScript", "verified": True },
                { "name": "Next.js", "verified": True }
            ],
            "training": {
                "cohort_code": "COHORT-2026-REACT",
                "track": "React Full-Stack",
                "trainer": "Marcus Aurelius",
                "progress_percentage": 100,
                "mock_project_score": 88
            }
        },
        {
            "id": "PROF-003",
            "name": "Alice Smith",
            "target_role": "ML Research Scientist",
            "status": "Bench",
            "readiness_score": 98,
            "skills": [
                { "name": "Python", "verified": True },
                { "name": "PyTorch", "verified": True },
                { "name": "Transformers", "verified": True },
                { "name": "Generative AI", "verified": True }
            ],
            "training": {
                "cohort_code": "COHORT-2026-ML",
                "track": "Machine Learning",
                "trainer": "Ada Lovelace",
                "progress_percentage": 100,
                "mock_project_score": 95
            }
        },
        {
            "id": "PROF-004",
            "name": "Bob Johnson",
            "target_role": "Data Engineer",
            "status": "Engaged",
            "readiness_score": 89,
            "skills": [
                { "name": "Spark", "verified": True },
                { "name": "Scala", "verified": True },
                { "name": "PostgreSQL", "verified": True }
            ],
            "training": {
                "cohort_code": "COHORT-2026-CLOUDOPS",
                "track": "Data Engineering",
                "trainer": "Grace Hopper",
                "progress_percentage": 100,
                "mock_project_score": 82
            }
        }
    ]
    for c in candidates:
        db.candidates.update_one({"id": c["id"]}, {"$set": c}, upsert=True)
        email = f"{c['name'].lower().replace(' ', '.')}@workforcex.com"
        db.users.update_one(
            {"email": email},
            {"$set": {
                "email": email,
                "password_hash": hash_password("password123"),
                "role": "Professional",
                "professional_id": c["id"]
            }},
            upsert=True
        )

def seed_db():
    db = get_db()
    if db.candidates.count_documents({}) > 0:
        print("Database already populated. Skipping seed pipeline.")
        return

    # Find project root directory relative to this config file
    database_dir = os.path.dirname(os.path.abspath(__file__))
    app_dir = os.path.dirname(database_dir)
    root_dir = os.path.dirname(app_dir)
    excel_path = os.path.join(root_dir, 'Data', 'workforcex dashboard (1).xlsx')

    default_skills = [
        'Cloud Architecture', 'AWS', 'Kubernetes', 'Docker',
        'React', 'TypeScript', 'Next.js', 'Vanilla CSS',
        'Python', 'PyTorch', 'Transformers', 'Generative AI',
        'Spark', 'Scala', 'PostgreSQL', 'Security Auditing'
    ]
    
    if os.path.exists(excel_path):
        print(f"Loading raw Excel records from: {excel_path}...")
        try:
            import openpyxl
            wb = openpyxl.load_workbook(excel_path, read_only=True)
            ws = wb['Employee datas']
            
            rows_iter = ws.iter_rows(min_row=2, values_only=True)
            inserted_count = 0

            bulk_candidates = []
            bulk_users = []

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
                
                if inserted_count % 5 == 0:
                    status = 'Training'
                    cohort_progress = 30 + (inserted_count % 60)
                    mock_score = 0
                elif inserted_count % 8 == 0:
                    status = 'Engaged'
                    cohort_progress = 100
                    mock_score = 75 + (inserted_count % 25)
                else:
                    status = 'Bench'
                    cohort_progress = 100
                    mock_score = 75 + (inserted_count % 25)

                readiness = 65 + (rating * 7)
                if readiness > 100: readiness = 100

                candidate_skills = []
                role_lower = role.lower()
                cohort_code = "COHORT-2026-REACT"
                track_name = "React Full-Stack"
                
                if 'technician' in role_lower or 'production' in role_lower:
                    candidate_skills = ["AWS", "Docker", "PostgreSQL"]
                    cohort_code = "COHORT-2026-CLOUDOPS"
                    track_name = "Cloud DevOps"
                elif 'sales' in role_lower or 'manager' in role_lower:
                    candidate_skills = ["Cloud Architecture", "Security Auditing", "PostgreSQL"]
                    cohort_code = "COHORT-2026-CLOUDOPS"
                    track_name = "Cloud DevOps"
                elif 'ml' in role_lower or 'scientist' in role_lower or 'data' in role_lower:
                    candidate_skills = ["Python", "PyTorch", "Transformers", "Generative AI", "Spark"]
                    cohort_code = "COHORT-2026-ML"
                    track_name = "Machine Learning"
                elif 'developer' in role_lower or 'engineer' in role_lower:
                    candidate_skills = ["React", "TypeScript", "Next.js", "Vanilla CSS", "Docker"]
                    cohort_code = "COHORT-2026-REACT"
                    track_name = "React Full-Stack"
                else:
                    candidate_skills = ["TypeScript", "Docker", "PostgreSQL"]

                skills_list = [{"name": sname, "verified": True} for sname in candidate_skills]

                bulk_candidates.append({
                    "id": prof_id,
                    "name": name,
                    "target_role": role,
                    "status": status,
                    "readiness_score": readiness,
                    "skills": skills_list,
                    "training": {
                        "cohort_code": cohort_code,
                        "track": track_name,
                        "trainer": "Marcus Aurelius" if "REACT" in cohort_code else ("Ada Lovelace" if "ML" in cohort_code else "Grace Hopper"),
                        "progress_percentage": cohort_progress,
                        "mock_project_score": mock_score
                    },
                    "assessments": []
                })

                bulk_users.append({
                    "email": email,
                    "password_hash": hash_password("password123"),
                    "role": "Professional",
                    "professional_id": prof_id
                })
                inserted_count += 1

            if bulk_candidates:
                db.candidates.insert_many(bulk_candidates)
            if bulk_users:
                db.users.insert_many(bulk_users)

            print(f"Database seeder complete! Created {inserted_count} candidate records.")
        except Exception as e:
            print("Spreadsheet seed pipeline encountered an error, falling back:", str(e))
            _fallback_seeds(db)
    else:
        print("Excel spreadsheet not found. Executing defaults mock seeder.")
        _fallback_seeds(db)

    # Seed Admin Account
    db.users.update_one(
        {"email": "employer@workforcex.com"},
        {"$set": {
            "email": "employer@workforcex.com",
            "password_hash": hash_password("password123"),
            "role": "Employer",
            "professional_id": None
        }},
        upsert=True
    )

    # Seed Sarah Connor
    sarah_doc = {
        "id": "PROF-001",
        "name": "Sarah Connor",
        "target_role": "Solutions Architect",
        "status": "Bench",
        "readiness_score": 96,
        "skills": [
            { "name": "Cloud Architecture", "verified": True },
            { "name": "AWS", "verified": True },
            { "name": "Kubernetes", "verified": True }
        ],
        "training": {
            "cohort_code": "COHORT-2026-CLOUDOPS",
            "track": "Cloud DevOps",
            "trainer": "Grace Hopper",
            "progress_percentage": 100,
            "mock_project_score": 94
        },
        "assessments": []
    }
    db.candidates.update_one({"id": "PROF-001"}, {"$set": sarah_doc}, upsert=True)
    db.users.update_one(
        {"email": "sarah@workforcex.com"},
        {"$set": {
            "email": "sarah@workforcex.com",
            "password_hash": hash_password("password123"),
            "role": "Professional",
            "professional_id": "PROF-001"
        }},
        upsert=True
    )

    # Projects
    proj_doc = {
        "id": "PROJ-001",
        "name": "Delta Core Dev Team",
        "size": 1,
        "status": "Active",
        "members": [
            { "id": "PROF-001", "name": "Sarah Connor", "role": "Solutions Architect" }
        ]
    }
    db.projects.update_one({"id": "PROJ-001"}, {"$set": proj_doc}, upsert=True)

    # Requisitions
    requisitions = [
        {
            "id": "REQ-102",
            "role": "Staff ML Engineer",
            "project_name": "NeuralCore v2",
            "status": "Matching",
            "required_skills": ["Python", "PyTorch", "Transformers", "Generative AI"]
        },
        {
            "id": "REQ-103",
            "role": "Lead DevOps Architect",
            "project_name": "CloudScale Migrations",
            "status": "Interviewing",
            "required_skills": ["Cloud Architecture", "AWS", "Kubernetes", "Docker"]
        },
        {
            "id": "REQ-104",
            "role": "Full Stack React Engineer",
            "project_name": "Liquidity Dashboard",
            "status": "Draft",
            "required_skills": ["React", "TypeScript", "Next.js", "Vanilla CSS"]
        }
    ]
    for r in requisitions:
        db.requisitions.update_one({"id": r["id"]}, {"$set": r}, upsert=True)

    # Assessments
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
        db.assessments.update_one({"id": a["id"]}, {"$set": a}, upsert=True)

    print("MongoDB Atlas workspace seed synchronization complete.")
