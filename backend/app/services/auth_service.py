import datetime
import jwt
from app.config import Config
from app.repositories import UserRepository, CandidateRepository
from app.database import hash_password

class AuthService:
    @staticmethod
    def register_user(email, password, role, name='Anonymous', job_role='Engineer'):
        if UserRepository.get_by_email(email):
            raise ValueError("Email is already registered.")

        prof_id = None
        if role == 'Professional':
            next_num = CandidateRepository.count({}) + 1
            prof_id = f"PROF-{next_num:03d}"
            
            # Setup a new candidate document (un-onboarded initial state)
            cand_doc = {
                "id": prof_id,
                "name": name,
                "target_role": job_role,
                "status": "Bench",
                "readiness_score": 75,
                "skills": [],
                "training": {
                    "cohort_code": None,
                    "track": None,
                    "trainer": None,
                    "progress_percentage": 0,
                    "mock_project_score": 0
                },
                "assessments": []
            }
            CandidateRepository.create(cand_doc)
            
        hashed = hash_password(password)
        user_doc = {
            "email": email,
            "password_hash": hashed,
            "role": role,
            "professional_id": prof_id
        }
        UserRepository.create(user_doc)
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

        # Issue JWT Token
        payload = {
            'email': user['email'],
            'role': user['role'],
            'professionalId': user.get('professional_id'),
            'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=Config.ACCESS_TOKEN_EXPIRE_MINUTES)
        }
        token = jwt.encode(payload, Config.JWT_SECRET, algorithm=Config.JWT_ALGORITHM)
        
        return {
            'token': token,
            'user': {
                'email': user['email'],
                'role': user['role'],
                'professionalId': user.get('professional_id')
            }
        }
