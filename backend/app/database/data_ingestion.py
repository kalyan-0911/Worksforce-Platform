"""
WorkForceX Data Ingestion Pipeline
===================================
Reads raw datasets using Pandas, preprocesses them into clean documents,
and bulk-inserts them into MongoDB Atlas collections.

Collections populated:
  - employees    : 3,150 real employee records
  - candidates   : derived professional profiles (from employees)
  - users        : auth accounts for each candidate (password: workforce123)
  - job_postings : ~10,000 sampled real Indian job listings
  - assessments  : static skill certification tests
  - users        : default employer account
"""

import os
import re
import hashlib
import binascii
import pandas as pd
import numpy as np
from pymongo import MongoClient
from pymongo.server_api import ServerApi

# ─────────────────────────────────────────────
# Connection helpers
# ─────────────────────────────────────────────

def get_db():
    uri = os.environ.get("MONGO_URI", "mongodb://localhost:27017/")
    db_name = os.environ.get("DATABASE_NAME", "workforcex")
    client = MongoClient(uri, server_api=ServerApi("1"), serverSelectionTimeoutMS=15000)
    return client[db_name]

from app.database.mongodb import hash_password



# ─────────────────────────────────────────────
# Skill Normalization Vocabulary
# ─────────────────────────────────────────────

SKILL_ALIASES = {
    # Frontend
    "react.js": "React", "reactjs": "React", "react js": "React",
    "vue.js": "Vue.js", "vuejs": "Vue.js",
    "angular.js": "Angular", "angularjs": "Angular",
    "javascript": "JavaScript", "js": "JavaScript",
    "typescript": "TypeScript", "ts": "TypeScript",
    "next.js": "Next.js", "nextjs": "Next.js",
    "css3": "CSS", "css": "CSS", "sass": "SASS", "scss": "SASS",
    "html5": "HTML", "html": "HTML",

    # Backend
    "nodejs": "Node.js", "node.js": "Node.js", "node": "Node.js",
    "python3": "Python", "python 3": "Python",
    "django rest framework": "Django", "django rest": "Django",
    "fastapi": "FastAPI", "flask": "Flask",
    "spring boot": "Spring Boot", "springboot": "Spring Boot",
    "golang": "Go", "go lang": "Go",

    # Data / ML
    "machine learning": "Machine Learning", "ml": "Machine Learning",
    "deep learning": "Deep Learning", "dl": "Deep Learning",
    "artificial intelligence": "AI", "ai": "AI",
    "pytorch": "PyTorch", "torch": "PyTorch",
    "tensorflow": "TensorFlow", "tf": "TensorFlow",
    "scikit learn": "Scikit-Learn", "scikit-learn": "Scikit-Learn",
    "pandas": "Pandas", "numpy": "NumPy",
    "nlp": "NLP", "natural language processing": "NLP",
    "generative ai": "Generative AI", "llm": "LLM",

    # Cloud / DevOps
    "amazon web services": "AWS", "aws cloud": "AWS",
    "google cloud platform": "GCP", "gcp": "GCP",
    "microsoft azure": "Azure",
    "kubernetes": "Kubernetes", "k8s": "Kubernetes",
    "docker": "Docker", "containerization": "Docker",
    "ci/cd": "CI/CD", "cicd": "CI/CD",
    "devops": "DevOps", "dev ops": "DevOps",
    "terraform": "Terraform",
    "jenkins": "Jenkins",

    # Databases
    "postgresql": "PostgreSQL", "postgres": "PostgreSQL",
    "mysql": "MySQL", "mongo": "MongoDB", "mongodb": "MongoDB",
    "redis": "Redis", "elasticsearch": "Elasticsearch",
    "sql": "SQL", "nosql": "NoSQL",

    # Security / Networking
    "cyber security": "Cybersecurity", "cybersecurity": "Cybersecurity",
    "network security": "Network Security",
    "ethical hacking": "Ethical Hacking",

    # HR / Business
    "recruitment": "Recruitment", "hiring": "Recruitment",
    "staffing": "Staffing", "manpower": "Staffing",
    "communication skills": "Communication",
    "leadership": "Leadership", "team management": "Team Management",
    "project management": "Project Management",
    "agile": "Agile", "scrum": "Scrum",
    "excel": "Microsoft Excel", "microsoft excel": "Microsoft Excel",
    "power bi": "Power BI", "tableau": "Tableau",
}

TITLE_SKILL_MAP = {
    "Production Technician I":     ["Operations", "Quality Control", "Manufacturing"],
    "Production Technician II":    ["Operations", "Quality Control", "Manufacturing", "Process Improvement"],
    "Area Sales Manager":          ["Sales", "Team Management", "Communication", "CRM"],
    "IT Support":                  ["Technical Support", "Windows", "Networking", "Troubleshooting"],
    "Network Engineer":            ["Networking", "Cisco", "TCP/IP", "Firewall Configuration"],
    "Sr. Network Engineer":        ["Networking", "Cisco", "TCP/IP", "Network Security", "CCNA"],
    "Principal Data Architect":    ["SQL", "NoSQL", "Data Modeling", "AWS", "ETL"],
    "Enterprise Architect":        ["Solution Architecture", "Cloud Architecture", "AWS", "Microservices"],
    "Software Engineer":           ["Python", "Java", "SQL", "Git", "Agile"],
    "Sr. Software Engineer":       ["Python", "Java", "System Design", "AWS", "Docker"],
    "Data Analyst":                ["SQL", "Python", "Tableau", "Excel", "Statistics"],
    "Data Engineer":               ["Python", "Spark", "SQL", "ETL", "AWS"],
    "Data Scientist":              ["Python", "Machine Learning", "TensorFlow", "SQL", "Statistics"],
    "ML Engineer":                 ["Python", "PyTorch", "TensorFlow", "MLOps", "Docker"],
    "DevOps Engineer":             ["Docker", "Kubernetes", "CI/CD", "Terraform", "AWS"],
    "Security Engineer":           ["Cybersecurity", "Ethical Hacking", "Network Security", "Penetration Testing"],
    "HR Manager":                  ["Recruitment", "Staffing", "Communication", "Team Management"],
    "Accountant":                  ["Microsoft Excel", "Accounting", "Financial Reporting", "Tally"],
    "Business Analyst":            ["Requirements Gathering", "SQL", "Agile", "Communication", "Project Management"],
    "Project Manager":             ["Project Management", "Agile", "Scrum", "Communication", "Leadership"],
    "Executive":                   ["Leadership", "Strategy", "Communication", "Decision Making"],
}

COHORT_MAP = {
    "React": "COHORT-2026-REACT",
    "TypeScript": "COHORT-2026-REACT",
    "Next.js": "COHORT-2026-REACT",
    "JavaScript": "COHORT-2026-REACT",
    "Vue.js": "COHORT-2026-REACT",
    "Angular": "COHORT-2026-REACT",
    "Python": "COHORT-2026-ML",
    "Machine Learning": "COHORT-2026-ML",
    "Deep Learning": "COHORT-2026-ML",
    "PyTorch": "COHORT-2026-ML",
    "TensorFlow": "COHORT-2026-ML",
    "Data Scientist": "COHORT-2026-ML",
    "AWS": "COHORT-2026-CLOUDOPS",
    "Docker": "COHORT-2026-CLOUDOPS",
    "Kubernetes": "COHORT-2026-CLOUDOPS",
    "DevOps": "COHORT-2026-CLOUDOPS",
    "Terraform": "COHORT-2026-CLOUDOPS",
    "SQL": "COHORT-2026-DATA",
    "PostgreSQL": "COHORT-2026-DATA",
    "MongoDB": "COHORT-2026-DATA",
    "ETL": "COHORT-2026-DATA",
    "Spark": "COHORT-2026-DATA",
}

COHORT_TRAINERS = {
    "COHORT-2026-REACT":     {"track": "React Full-Stack", "trainer": "Marcus Aurelius"},
    "COHORT-2026-ML":        {"track": "Machine Learning & AI", "trainer": "Ada Lovelace"},
    "COHORT-2026-CLOUDOPS":  {"track": "Cloud DevOps", "trainer": "Grace Hopper"},
    "COHORT-2026-DATA":      {"track": "Data Engineering", "trainer": "Alan Turing"},
    "COHORT-2026-GENERAL":   {"track": "General Engineering", "trainer": "Linus Torvalds"},
}

PERFORMANCE_SCORE_MAP = {
    "Exceeds":            10,
    "Fully Meets":         5,
    "Needs Improvement":  -5,
    "PIP":               -15,
}


def normalize_skill(raw: str) -> str:
    """Normalize a raw skill string to the canonical vocabulary."""
    cleaned = raw.strip().lower()
    return SKILL_ALIASES.get(cleaned, raw.strip().title())


def get_skills_for_title(title: str) -> list[str]:
    """Return a list of skills for a given job title."""
    for key, skills in TITLE_SKILL_MAP.items():
        if key.lower() in title.lower() or title.lower() in key.lower():
            return skills
    return ["Communication", "Microsoft Excel", "Project Management"]


def assign_cohort(skills: list[str]) -> str:
    """Assign a cohort code based on a candidate's primary skills."""
    votes = {}
    for skill in skills:
        cohort = COHORT_MAP.get(skill)
        if cohort:
            votes[cohort] = votes.get(cohort, 0) + 1
    if not votes:
        return "COHORT-2026-GENERAL"
    return max(votes, key=votes.get)


def compute_readiness(performance: str, rating: float) -> int:
    """Compute a readiness score (0-100) from performance label + rating."""
    base = 65
    perf_bonus = PERFORMANCE_SCORE_MAP.get(str(performance).strip(), 0)
    rating_bonus = int((float(rating) if pd.notna(rating) else 3.0) * 4)
    score = base + perf_bonus + rating_bonus
    return max(0, min(100, score))


# ─────────────────────────────────────────────
# Ingestion: Employee Dataset → employees + candidates + users
# ─────────────────────────────────────────────

def ingest_employees(db, excel_path: str):
    """
    Parse cleaned Employee Excel → employees + candidates + users collections.
    Skips if employees collection already has data.
    """
    if db.employees.count_documents({}) > 0:
        print(f"  [SKIP] employees already populated ({db.employees.count_documents({})} docs).")
        return

    print(f"  [LOAD] Reading employee Excel: {excel_path}")
    df = pd.read_excel(excel_path, sheet_name='Employee datas')
    df = df.replace({np.nan: None})

    employees_bulk = []
    candidates_bulk = []
    users_bulk = []
    seen_emails = set()

    for idx, row in df.iterrows():
        first = str(row.get("FirstName") or "").strip()
        last  = str(row.get("LastName") or "").strip()
        if not first or not last or first == "None" or last == "None":
            continue

        email = str(row.get("ADEmail") or "").strip().lower()
        if not email or "@" not in email:
            email = f"{first.lower()}.{last.lower()}@workforcex.com"

        if email in seen_emails:
            continue
        seen_emails.add(email)

        emp_id_raw = row.get("Employee ID")
        emp_id = f"EMP-{int(emp_id_raw)}" if pd.notna(emp_id_raw) else f"EMP-{idx+1000}"
        prof_id = f"PROF-{int(emp_id_raw)}" if pd.notna(emp_id_raw) else f"PROF-{idx+1000}"

        title        = str(row.get("Title") or "").strip() or "General Staff"
        department   = str(row.get("DepartmentType") or "").strip().rstrip() or "General"
        division     = str(row.get("Division") or "").strip() or "General"
        business_unit= str(row.get("BusinessUnit") or "").strip() or "Corporate"
        emp_status   = str(row.get("EmployeeStatus") or "Active").strip()
        emp_type     = str(row.get("EmployeeType") or "").strip()
        pay_zone     = str(row.get("PayZone") or "").strip()
        perf_score   = str(row.get("Performance Score") or "Fully Meets").strip()
        rating       = row.get("Current Employee Rating")
        engagement   = row.get("Engagement Score")
        satisfaction = row.get("Satisfaction Score")
        wlb          = row.get("Work-Life Balance Score")
        gender       = str(row.get("GenderCode") or "").strip()
        state        = str(row.get("State") or "").strip()
        supervisor   = str(row.get("Supervisor") or "").strip()

        # Training fields
        t_program  = str(row.get("Training Program Name") or "").strip()
        t_type     = str(row.get("Training Type") or "").strip()
        t_outcome  = str(row.get("Training Outcome") or "").strip()
        t_trainer  = str(row.get("Trainer") or "").strip()
        t_duration = row.get("Training Duration(Days)")
        t_cost     = row.get("Training Cost")

        # ── Employee document (full HR record)
        employee_doc = {
            "employee_id":     emp_id,
            "first_name":      first,
            "last_name":       last,
            "name":            f"{first} {last}",
            "email":           email,
            "title":           title,
            "supervisor":      supervisor,
            "department":      department,
            "division":        division,
            "business_unit":   business_unit,
            "employee_status": emp_status,
            "employee_type":   emp_type,
            "pay_zone":        pay_zone,
            "performance_score": perf_score,
            "current_rating":  float(rating) if pd.notna(rating) else None,
            "engagement_score":float(engagement) if pd.notna(engagement) else None,
            "satisfaction_score": float(satisfaction) if pd.notna(satisfaction) else None,
            "work_life_balance_score": float(wlb) if pd.notna(wlb) else None,
            "gender":          gender,
            "state":           state,
            "training": {
                "program_name":   t_program or None,
                "type":           t_type or None,
                "outcome":        t_outcome or None,
                "trainer":        t_trainer or None,
                "duration_days":  int(t_duration) if pd.notna(t_duration) else None,
                "cost":           round(float(t_cost), 2) if pd.notna(t_cost) else None,
            },
        }
        employees_bulk.append(employee_doc)

        # ── Candidate document (professional platform profile)
        raw_skills     = get_skills_for_title(title)
        cohort_code    = assign_cohort(raw_skills)
        cohort_info    = COHORT_TRAINERS[cohort_code]
        readiness      = compute_readiness(perf_score, rating)

        # Determine platform status from employee_status
        if emp_status in ("Active", "Future Start"):
            plat_status = "Bench"
        elif emp_status == "Leave of Absence":
            plat_status = "Training"
        else:
            plat_status = "Bench"   # terminated employees can re-onboard

        # Training progress derived from training outcome
        progress = 0
        if t_outcome == "Passed":
            progress = 100
        elif t_outcome == "Failed":
            progress = 60
        elif t_outcome:
            progress = 30

        candidate_doc = {
            "id":           prof_id,
            "employee_id":  emp_id,
            "name":         f"{first} {last}",
            "email":        email,
            "title":        title,
            "department":   department,
            "division":     division,
            "status":       plat_status,
            "readiness_score": readiness,
            "skills": [{"name": s, "verified": False} for s in raw_skills],
            "training": {
                "cohort_code":         cohort_code,
                "track":               cohort_info["track"],
                "trainer":             t_trainer or cohort_info["trainer"],
                "progress_percentage": progress,
                "mock_project_score":  0,
                "program_name":        t_program or None,
                "outcome":             t_outcome or None,
            },
            "assessments":        [],
            "onboarded":          True,   # seeded from dataset — already onboarded
        }
        candidates_bulk.append(candidate_doc)

        # ── User auth document
        user_doc = {
            "email":           email,
            "password_hash":   hash_password("workforce123"),
            "role":            "Professional",
            "professional_id": prof_id,
        }
        users_bulk.append(user_doc)

    # Bulk insert
    if employees_bulk:
        db.employees.insert_many(employees_bulk, ordered=False)
        print(f"  [OK]   Inserted {len(employees_bulk)} employee records.")

    if candidates_bulk:
        db.candidates.insert_many(candidates_bulk, ordered=False)
        print(f"  [OK]   Inserted {len(candidates_bulk)} candidate profiles.")

    if users_bulk:
        # Avoid duplicate key errors gracefully
        for u in users_bulk:
            db.users.update_one({"email": u["email"]}, {"$setOnInsert": u}, upsert=True)
        print(f"  [OK]   Upserted {len(users_bulk)} candidate user accounts.")


# ─────────────────────────────────────────────
# Ingestion: Indian Job Market → job_postings
# ─────────────────────────────────────────────

def ingest_job_postings(db, excel_path: str, sample_size: int = 10000):
    """
    Parse Indian job market dataset → job_postings collection.
    Samples up to sample_size rows for performance.
    Skips if already populated.
    """
    if db.job_postings.count_documents({}) > 0:
        print(f"  [SKIP] job_postings already populated ({db.job_postings.count_documents({})} docs).")
        return

    print(f"  [LOAD] Reading job market Excel (sampling {sample_size} rows)...")
    df = pd.read_excel(excel_path)

    # Drop rows with no title or skills
    df = df.dropna(subset=["title", "tagsAndSkills"])
    df = df.sample(n=min(sample_size, len(df)), random_state=42).reset_index(drop=True)
    df = df.replace({np.nan: None})

    jobs_bulk = []

    for idx, row in df.iterrows():
        title   = str(row.get("title") or "").strip()
        company = str(row.get("companyName") or "").strip()
        if not title or not company:
            continue

        # Parse and normalize skills
        raw_skills_str = str(row.get("tagsAndSkills") or "")
        raw_skills     = [s.strip() for s in raw_skills_str.split(",") if s.strip()]
        norm_skills    = list(dict.fromkeys([normalize_skill(s) for s in raw_skills]))  # deduplicate, preserve order

        # Salary
        sal_min = row.get("minimumSalary")
        sal_max = row.get("maximumSalary")
        sal_min = int(sal_min) if pd.notna(sal_min) else None
        sal_max = int(sal_max) if pd.notna(sal_max) else None

        # Experience
        exp_min = row.get("minimumExperience")
        exp_max = row.get("maximumExperience")
        exp_min = int(exp_min) if pd.notna(exp_min) else 0
        exp_max = int(exp_max) if pd.notna(exp_max) else 5

        # Location — take city only (before parenthesis)
        raw_loc = str(row.get("location") or "").strip()
        location = re.sub(r"\(.*?\)", "", raw_loc).strip()
        location = location.split(",")[0].strip()

        rating  = row.get("AggregateRating")
        reviews = row.get("ReviewsCount")

        job_doc = {
            "job_id":         str(row.get("jobId") or f"JOB-{idx}"),
            "title":          title,
            "company":        company,
            "skills":         norm_skills,
            "experience_min": exp_min,
            "experience_max": exp_max,
            "salary_min":     sal_min,
            "salary_max":     sal_max,
            "location":       location or "India",
            "description":    str(row.get("jobDescription") or "").strip()[:1000],  # cap at 1000 chars
            "rating":         round(float(rating), 1) if pd.notna(rating) else None,
            "reviews_count":  int(reviews) if pd.notna(reviews) else 0,
            "currency":       "INR",
        }
        jobs_bulk.append(job_doc)

    if jobs_bulk:
        db.job_postings.insert_many(jobs_bulk, ordered=False)
        print(f"  [OK]   Inserted {len(jobs_bulk)} job postings.")
        
    # Extract unique organizations and insert
    print(f"  [LOAD] Extracting unique organizations...")
    unique_companies = df['companyName'].dropna().unique()
    orgs_bulk = []
    
    # We fetch existing orgs to avoid duplicates
    existing_orgs = set(doc['company_name'] for doc in db.organizations.find({}, {"company_name": 1}))
    
    for comp in unique_companies:
        comp_str = str(comp).strip()
        if not comp_str or comp_str in existing_orgs:
            continue
            
        orgs_bulk.append({
            "company_name": comp_str,
            "industry": "Technology", # Default placeholder
            "location": "India",      # Default placeholder
            "company_size": "50-200", # Default placeholder
            "user_id": None,          # Unclaimed organization
        })
        existing_orgs.add(comp_str)
        
    if orgs_bulk:
        db.organizations.insert_many(orgs_bulk, ordered=False)
        print(f"  [OK]   Inserted {len(orgs_bulk)} new organizations.")


# ─────────────────────────────────────────────
# Ingestion: Static Assessments Seed
# ─────────────────────────────────────────────

def seed_assessments(db):
    if db.assessments.count_documents({}) > 0:
        print(f"  [SKIP] assessments already seeded.")
        return

    assessments = [
        {
            "id": "react-arch",
            "title": "React Architecture & Patterns",
            "skill_name": "React",
            "track": "COHORT-2026-REACT",
            "questions": [
                {"q": "Which hook memoizes the result of an expensive computation?",
                 "options": ["useEffect", "useCallback", "useMemo", "useRef"], "answer": 2},
                {"q": "What does React 18's automatic batching do?",
                 "options": ["Batches only event handler updates", "Batches updates across promises, timeouts and native handlers", "Groups components into files", "Automates rendering threads"], "answer": 1},
                {"q": "What is the purpose of React.Suspense?",
                 "options": ["Error handling", "Lazy loading components with a fallback UI", "Context management", "State synchronization"], "answer": 1},
            ]
        },
        {
            "id": "python-ml",
            "title": "Python & Machine Learning",
            "skill_name": "Machine Learning",
            "track": "COHORT-2026-ML",
            "questions": [
                {"q": "Which library is used for tensor computation and deep learning?",
                 "options": ["Pandas", "Scikit-Learn", "PyTorch", "Matplotlib"], "answer": 2},
                {"q": "What does fit_transform() do in Scikit-Learn?",
                 "options": ["Only trains", "Only transforms test data", "Calculates params and transforms training data in one step", "Plots data"], "answer": 2},
                {"q": "What layer captures sequential context in transformer architectures?",
                 "options": ["Convolutional", "Self-Attention", "MaxPooling", "Dense"], "answer": 1},
            ]
        },
        {
            "id": "cloud-devops",
            "title": "Cloud & DevOps Fundamentals",
            "skill_name": "AWS",
            "track": "COHORT-2026-CLOUDOPS",
            "questions": [
                {"q": "Which AWS service is used for container orchestration?",
                 "options": ["EC2", "S3", "EKS", "RDS"], "answer": 2},
                {"q": "What does IaC (Infrastructure as Code) mean?",
                 "options": ["Manually provisioning servers", "Managing infrastructure via config files and scripts", "Testing cloud apps", "Monitoring uptime"], "answer": 1},
                {"q": "What is a Docker container?",
                 "options": ["A virtual machine", "A lightweight isolated process environment", "A storage bucket", "A load balancer"], "answer": 1},
            ]
        },
        {
            "id": "data-engineering",
            "title": "Data Engineering & SQL",
            "skill_name": "SQL",
            "track": "COHORT-2026-DATA",
            "questions": [
                {"q": "What does an ETL pipeline stand for?",
                 "options": ["Extract Transform Load", "Evaluate Test Launch", "Encrypt Transfer Log", "Execute Test Loop"], "answer": 0},
                {"q": "Which SQL clause filters after aggregation?",
                 "options": ["WHERE", "GROUP BY", "HAVING", "ORDER BY"], "answer": 2},
                {"q": "What is Apache Spark primarily used for?",
                 "options": ["Front-end rendering", "Distributed large-scale data processing", "Database administration", "UI testing"], "answer": 1},
            ]
        },
        {
            "id": "security-audit",
            "title": "Enterprise Security Auditing",
            "skill_name": "Cybersecurity",
            "track": "COHORT-2026-CLOUDOPS",
            "questions": [
                {"q": "Which HTTP header prevents XSS via content injection?",
                 "options": ["Content-Security-Policy", "Access-Control-Allow-Origin", "Strict-Transport-Security", "Cache-Control"], "answer": 0},
                {"q": "What does the principle of least privilege mean?",
                 "options": ["All users get admin access", "Users only get permissions needed for their task", "Billing is separate", "Simple passwords are fine"], "answer": 1},
                {"q": "What is the main threat of SQL Injection?",
                 "options": ["Unauthorized DB read/write", "Network overload", "Phishing", "CPU overheating"], "answer": 0},
            ]
        },
    ]

    db.assessments.insert_many(assessments)
    print(f"  [OK]   Seeded {len(assessments)} skill assessments.")


# ─────────────────────────────────────────────
# Ingestion: Default Employer Account
# ─────────────────────────────────────────────

def seed_demo_accounts(db):
    # Admin
    if not db.users.find_one({"email": "admin@workforcex.com"}):
        db.users.insert_one({
            "email": "admin@workforcex.com",
            "password_hash": hash_password("workforce123"),
            "role": "Admin",
            "professional_id": None
        })
    # Employer
    if not db.users.find_one({"email": "employer@workforcex.com"}):
        res = db.users.insert_one({
            "email": "employer@workforcex.com",
            "password_hash": hash_password("workforce123"),
            "role": "Employer",
            "professional_id": None
        })
        db.organizations.insert_one({
            "email": "employer@workforcex.com",
            "user_id": str(res.inserted_id),
            "company_name": "WorkForceX Corp",
            "industry": "Technology",
            "location": "Bangalore",
            "company_size": "201-500",
        })
    # Professional
    if not db.users.find_one({"email": "professional@workforcex.com"}):
        db.users.insert_one({
            "email": "professional@workforcex.com",
            "password_hash": hash_password("workforce123"),
            "role": "Professional",
            "professional_id": "PROF-DEMO"
        })
        if not db.candidates.find_one({"id": "PROF-DEMO"}):
            # Fetch a real employee to use as the demo professional
            real_emp = db.employees.find_one()
            
            db.candidates.insert_one({
                "id": "PROF-DEMO",
                "name": real_emp.get("name", "Demo Professional") if real_emp else "Demo Professional",
                "target_role": real_emp.get("title", "Software Engineer") if real_emp else "Software Engineer",
                "status": "Bench",
                "readiness_score": int(real_emp.get("current_rating", 3.4) * 20) if real_emp else 85,
                "skills": [{"name": "React", "verified": True}],
                "training": {
                    "cohort_code": "COHORT-2026-REACT",
                    "track": "React Full-Stack",
                    "trainer": "Marcus Aurelius",
                    "progress_percentage": 50,
                    "mock_project_score": 0
                },
                "assessments": [],
                "onboarded": True
            })
    print("  [OK]   Demo accounts verified (admin, employer, professional).")


# ─────────────────────────────────────────────
# Index Creation
# ─────────────────────────────────────────────

def create_indexes(db):
    print("  [IDX]  Creating MongoDB indexes...")
    db.users.create_index("email", unique=True)
    db.employees.create_index("employee_id", unique=True)
    db.employees.create_index("email")
    db.candidates.create_index("id", unique=True)
    db.candidates.create_index("email")
    db.candidates.create_index("status")
    db.candidates.create_index("skills.name")
    db.job_postings.create_index("job_id", unique=True)
    db.job_postings.create_index("skills")
    db.job_postings.create_index("title")
    db.job_postings.create_index("location")
    db.projects.create_index("id", unique=True)
    db.requisitions.create_index("id", unique=True)
    db.assessments.create_index("id", unique=True)
    print("  [OK]   Indexes ready.")


# ─────────────────────────────────────────────
# Main Entry Point
# ─────────────────────────────────────────────
# =============================================

def run_ingestion():
    # Load .env manually if running standalone
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip().strip("'\""))

    db = get_db()

    # Resolve dataset paths relative to this file's location
    # data_ingestion.py is at: backend/app/database/data_ingestion.py
    # Data/ is at:             workforce/Data/
    here       = os.path.dirname(os.path.abspath(__file__))  # backend/app/database
    backend_dir = os.path.dirname(os.path.dirname(here))      # backend
    project_dir = os.path.dirname(backend_dir)                # workforce (project root)
    data_dir   = os.path.join(project_dir, "Data")
    emp_excel  = os.path.join(data_dir, "workforcex dashboard data with raw and cleaned file.xlsx")
    jobs_excel = os.path.join(data_dir, "employer data.xlsx")

    print("\n==============================================")
    print("   WorkForceX -- Data Ingestion Pipeline")
    print("==============================================")

    create_indexes(db)

    print("\n[1/4] Ingesting Employee Dataset...")
    if os.path.exists(emp_excel):
        ingest_employees(db, emp_excel)
    else:
        print(f"  [WARN] Employee Excel not found at: {emp_excel}")

    print("\n[2/4] Ingesting Job Postings Dataset...")
    if os.path.exists(jobs_excel):
        ingest_job_postings(db, jobs_excel)
    else:
        print(f"  [WARN] Job market Excel not found at: {jobs_excel}")

    print("\n[3/4] Seeding Assessments...")
    seed_assessments(db)

    print("\n[4/4] Seeding Demo Accounts...")
    seed_demo_accounts(db)

    print("\n==============================================")
    print("   Ingestion Complete!")
    print(f"   employees:    {db.employees.count_documents({})}")
    print(f"   candidates:   {db.candidates.count_documents({})}")
    print(f"   users:        {db.users.count_documents({})}")
    print(f"   job_postings: {db.job_postings.count_documents({})}")
    print(f"   assessments:  {db.assessments.count_documents({})}")
    print("==============================================\n")


if __name__ == "__main__":
    run_ingestion()
