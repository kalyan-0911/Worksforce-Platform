import datetime
import jwt
from app.config import Config
from app.repositories import UserRepository, CandidateRepository
from app.database import hash_password, get_db

class AuthService:
    @staticmethod
    def register_user(email, password, role, extra_data=None):
        if not extra_data:
            extra_data = {}
            
        if UserRepository.get_by_email(email):
            raise ValueError("Email is already registered.")

        hashed = hash_password(password)
        user_doc = {
            "email": email,
            "password_hash": hashed,
            "role": role,
            "professional_id": None
        }
        
        db = get_db()
        result = db.users.insert_one(user_doc)
        user_id = str(result.inserted_id)

        prof_id = None
        if role == 'Professional':
            next_num = CandidateRepository.count({}) + 1
            prof_id = f"PROF-{next_num:03d}"
            
            career_path = extra_data.get('career_path', 'Full Stack')
            cand_doc = {
                "id": prof_id,
                "user_id": user_id,
                "name": extra_data.get('name', 'Anonymous'),
                "target_role": extra_data.get('job_role', 'Engineer'),
                "status": "Bench",
                "readiness_score": 0,
                "tier": "Bronze",
                "availability": "Available",
                "skills": [],
                "training": {
                    "cohort_code": None,
                    "track": career_path,
                    "trainer": None,
                    "progress_percentage": 0,
                    "mock_project_score": 0
                },
                "assessments": []
            }
            CandidateRepository.create(cand_doc)
            db.users.update_one({"_id": result.inserted_id}, {"$set": {"professional_id": prof_id}})
        elif role == 'Employer':
            org_doc = {
                "user_id": user_id,
                "email": email,
                "company_name": extra_data.get('company_name', 'Default Corp'),
                "industry": extra_data.get('industry', 'Tech'),
                "company_size": extra_data.get('company_size', '1-10'),
                "location": extra_data.get('location', 'Remote')
            }
            db.organizations.insert_one(org_doc)

        return {
            'role': role,
            'professionalId': prof_id
        }

    @staticmethod
    def authenticate_user(email, password):
        user = UserRepository.get_by_email(email)
        if not user:
            raise PermissionError("Invalid email or password.")

        hashed = hash_password(password)
        if user['password_hash'] != hashed:
            raise PermissionError("Invalid email or password.")

        payload = {
            'id': str(user['_id']),
            'email': user['email'],
            'role': user['role'],
            'professionalId': user.get('professional_id'),
            'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=Config.ACCESS_TOKEN_EXPIRE_MINUTES)
        }
        token = jwt.encode(payload, Config.JWT_SECRET, algorithm=Config.JWT_ALGORITHM)
        
        return {
            'token': token,
            'user': {
                'id': str(user['_id']),
                'email': user['email'],
                'role': user['role'],
                'professionalId': user.get('professional_id')
            }
        }
