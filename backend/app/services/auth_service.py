import datetime
import jwt
from app.config import Config
from app.repositories import UserRepository, CandidateRepository
from app.database import hash_password, check_password, get_db

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
            "profile_id": None
        }
        
        db = get_db()
        result = db.users.insert_one(user_doc)
        user_id = str(result.inserted_id)

        import uuid
        profile_id = None
        if role == 'Professional':
            profile_id = f"PROF-{uuid.uuid4().hex[:8].upper()}"
            
            career_path = extra_data.get('career_path', 'Full Stack')
            cand_doc = {
                "id": profile_id,
                "user_id": user_id,
                "name": extra_data.get('name', 'Anonymous'),
                "target_role": extra_data.get('target_role', 'Software Engineer'),
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
            db.users.update_one({"_id": result.inserted_id}, {"$set": {"profile_id": profile_id}})
        elif role == 'Employer':
            company_name = extra_data.get('company_name', 'Default Corp')
            industry = extra_data.get('industry', 'Tech')
            location = extra_data.get('location', 'Remote')
            company_size = extra_data.get('company_size', '1-10')
            website = extra_data.get('website', '')

            existing_org = db.organizations.find_one({"company_name": company_name})
            
            if existing_org and not existing_org.get("user_id"):
                profile_id = existing_org.get("id")
                if not profile_id:
                    profile_id = f"ORG-{uuid.uuid4().hex[:8].upper()}"
                db.organizations.update_one(
                    {"_id": existing_org["_id"]},
                    {"$set": {
                        "id": profile_id,
                        "user_id": user_id,
                        "email": email,
                        "industry": industry,
                        "location": location,
                        "company_size": company_size,
                        "website": website
                    }}
                )
            else:
                profile_id = f"ORG-{uuid.uuid4().hex[:8].upper()}"
                db.organizations.insert_one({
                    "id": profile_id,
                    "user_id": user_id,
                    "email": email,
                    "company_name": company_name,
                    "industry": industry,
                    "company_size": company_size,
                    "location": location,
                    "website": website
                })
            db.users.update_one({"_id": result.inserted_id}, {"$set": {"profile_id": profile_id}})

        return {
            'role': role,
            'profileId': profile_id
        }

    @staticmethod
    def authenticate_user(email, password):
        user = UserRepository.get_by_email(email)
        if not user:
            raise PermissionError("Invalid email or password.")

        if not check_password(password, user['password_hash']):
            raise PermissionError("Invalid email or password.")

        payload = {
            'id': str(user['_id']),
            'email': user['email'],
            'role': user['role'],
            'profileId': user.get('profile_id'),
            'professionalId': user.get('profile_id') if user.get('role') == 'Professional' else None,
            'type': 'access',
            'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=Config.ACCESS_TOKEN_EXPIRE_MINUTES)
        }
        token = jwt.encode(payload, Config.JWT_SECRET, algorithm=Config.JWT_ALGORITHM)
        
        refresh_payload = {
            'id': str(user['_id']),
            'type': 'refresh',
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7) # 7 days
        }
        refresh_token = jwt.encode(refresh_payload, Config.JWT_SECRET, algorithm=Config.JWT_ALGORITHM)
        
        return {
            'token': token,
            'refresh_token': refresh_token,
            'user': {
                'id': str(user['_id']),
                'email': user['email'],
                'role': user['role'],
                'profileId': user.get('profile_id')
            }
        }
