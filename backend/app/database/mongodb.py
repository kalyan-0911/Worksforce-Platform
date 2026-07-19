import os
import bcrypt
import logging
from pymongo import MongoClient, TEXT
from app.config import Config

logger = logging.getLogger(__name__)

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
    salt = bcrypt.gensalt(12)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def check_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False

# Collection Validator Definitions as per DATABASE_CONTRACT_v1
SCHEMAS = {
    "users": {
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["email", "password_hash", "role", "created_at", "updated_at"],
            "properties": {
                "email": {
                    "bsonType": "string",
                    "pattern": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
                    "description": "Must be a valid unique email address"
                },
                "password_hash": {
                    "bsonType": "string",
                    "description": "Bcrypt hashed password string"
                },
                "role": {
                    "enum": ["Professional", "Employer", "Admin"],
                    "description": "User persona authorization level"
                },
                "profile_id": {
                    "bsonType": ["string", "null"],
                    "pattern": "^(PROF-|ORG-)[A-Z0-9]{8,12}$",
                    "description": "ID pointing to professional or organization profile"
                },
                "created_at": { "bsonType": "date" },
                "updated_at": { "bsonType": "date" }
            }
        }
    },
    "candidates": {
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["id", "user_id", "name", "email", "title", "status", "readiness_score", "skills", "training", "created_at"],
            "properties": {
                "id": { "bsonType": "string", "pattern": "^PROF-[A-Z0-9]{8,12}$" },
                "user_id": { "bsonType": "string", "description": "References users._id" },
                "name": { "bsonType": "string" },
                "email": { "bsonType": "string", "pattern": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$" },
                "title": { "bsonType": "string" },
                "status": { "enum": ["Bench", "Engaged", "Training"] },
                "readiness_score": { "bsonType": "int", "minimum": 0, "maximum": 100 },
                "skills": {
                    "bsonType": "array",
                    "items": {
                        "bsonType": "object",
                        "required": ["name", "verified"],
                        "properties": {
                            "name": { "bsonType": "string" },
                            "verified": { "bsonType": "bool" }
                        }
                    }
                },
                "experience_years": { "bsonType": ["int", "null"] },
                "education": { "bsonType": ["string", "null"] },
                "summary": { "bsonType": ["string", "null"] },
                "key_strengths": { "bsonType": "array", "items": { "bsonType": "string" } },
                "areas_to_improve": { "bsonType": "array", "items": { "bsonType": "string" } },
                "training": {
                    "bsonType": "object",
                    "required": ["cohort_code", "track", "trainer", "progress_percentage", "mock_project_score"],
                    "properties": {
                        "cohort_code": { "bsonType": ["string", "null"] },
                        "track": { "bsonType": "string" },
                        "trainer": { "bsonType": ["string", "null"] },
                        "progress_percentage": { "bsonType": "int", "minimum": 0, "maximum": 100 },
                        "mock_project_score": { "bsonType": "int", "minimum": 0, "maximum": 100 }
                    }
                },
                "created_at": { "bsonType": "date" }
            }
        }
    },
    "organizations": {
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["id", "user_id", "email", "company_name", "industry", "location", "company_size", "created_at"],
            "properties": {
                "id": { "bsonType": "string", "pattern": "^ORG-[A-Z0-9]{8,12}$" },
                "user_id": { "bsonType": ["string", "null"], "description": "References users._id" },
                "email": { "bsonType": ["string", "null"] },
                "company_name": { "bsonType": "string" },
                "industry": { "bsonType": "string" },
                "location": { "bsonType": "string" },
                "company_size": { "bsonType": "string" },
                "website": { "bsonType": ["string", "null"] },
                "description": { "bsonType": ["string", "null"] },
                "internal_dataset": {
                    "bsonType": ["object", "null"],
                    "required": ["departments", "employee_count", "internal_skills", "workforce_distribution", "dataset_filename", "status"],
                    "properties": {
                        "departments": { "bsonType": "array", "items": { "bsonType": "string" } },
                        "employee_count": { "bsonType": "int" },
                        "internal_skills": { "bsonType": "array", "items": { "bsonType": "string" } },
                        "workforce_distribution": { "bsonType": "object" },
                        "dataset_filename": { "bsonType": "string" },
                        "status": { "enum": ["Processed", "Pending", "Failed"] }
                    }
                },
                "created_at": { "bsonType": "date" }
            }
        }
    },
    "requisitions": {
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["id", "organization_id", "role", "project_name", "status", "required_skills", "team_size", "created_at"],
            "properties": {
                "id": { "bsonType": "string", "pattern": "^REQ-[A-Z0-9]{8,12}$" },
                "organization_id": { "bsonType": "string", "pattern": "^ORG-[A-Z0-9]{8,12}$" },
                "role": { "bsonType": "string" },
                "project_name": { "bsonType": "string" },
                "status": { "enum": ["Draft", "Open", "Completed"] },
                "required_skills": { "bsonType": "array", "items": { "bsonType": "string" } },
                "project_description": { "bsonType": ["string", "null"] },
                "experience": { "bsonType": ["string", "null"] },
                "duration": { "bsonType": ["int", "null"] },
                "team_size": { "bsonType": "int", "minimum": 1 },
                "created_at": { "bsonType": "date" }
            }
        }
    },
    "projects": {
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["id", "organization_id", "name", "size", "status", "members", "created_at"],
            "properties": {
                "id": { "bsonType": "string", "pattern": "^PROJ-[A-Z0-9]{8,12}$" },
                "organization_id": { "bsonType": "string", "pattern": "^ORG-[A-Z0-9]{8,12}$" },
                "name": { "bsonType": "string" },
                "description": { "bsonType": ["string", "null"] },
                "size": { "bsonType": "int", "minimum": 1 },
                "status": { "enum": ["Planning", "Active", "Completed"] },
                "members": {
                    "bsonType": "array",
                    "items": {
                        "bsonType": "object",
                        "required": ["id", "name", "role", "status"],
                        "properties": {
                            "id": { "bsonType": "string", "pattern": "^PROF-[A-Z0-9]{8,12}$" },
                            "name": { "bsonType": "string" },
                            "role": { "bsonType": "string" },
                            "status": { "enum": ["Pending_Invitation", "Joined"] }
                        }
                    }
                },
                "created_at": { "bsonType": "date" }
            }
        }
    },
    "opportunities": {
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["id", "employer_id", "employer_name", "candidate_id", "project_name", "role", "status", "created_at"],
            "properties": {
                "id": { "bsonType": "string", "pattern": "^(OPP-|REQ-)[A-Z0-9]{8,12}$" },
                "employer_id": { "bsonType": "string", "pattern": "^ORG-[A-Z0-9]{8,12}$" },
                "employer_name": { "bsonType": "string" },
                "candidate_id": { "bsonType": "string", "pattern": "^PROF-[A-Z0-9]{8,12}$" },
                "project_id": { "bsonType": ["string", "null"], "pattern": "^PROJ-[A-Z0-9]{8,12}$" },
                "project_name": { "bsonType": "string" },
                "role": { "bsonType": "string" },
                "status": { "enum": ["Pending", "Accepted", "Rejected", "Candidate_Requested"] },
                "job_id": { "bsonType": ["string", "null"] },
                "created_at": { "bsonType": "date" }
            }
        }
    }
}

def init_db():
    print(f"Connecting to MongoDB database '{Config.DATABASE_NAME}'...")
    db = get_db()
    existing_collections = db.list_collection_names()
    
    # Apply Schema Validation for each collection
    print("Applying collection JSON schema validators...")
    for coll_name, schema in SCHEMAS.items():
        try:
            if coll_name not in existing_collections:
                db.create_collection(coll_name)
            db.command("collMod", coll_name, validator=schema)
            print(f"  [OK] Validator applied to collection '{coll_name}'")
        except Exception as e:
            print(f"  [WARN] Failed to apply validator to '{coll_name}': {e}")
            
    # Establish performance and index structures as per DATABASE_CONTRACT_v1
    print("Establishing database indexes...")
    try:
        # users indexes
        db.users.create_index("email", unique=True)
        
        # candidates indexes
        db.candidates.create_index("id", unique=True)
        db.candidates.create_index("email", unique=True)
        db.candidates.create_index("status")
        db.candidates.create_index("skills.name")
        try:
            db.candidates.create_index([("name", TEXT), ("title", TEXT)])
        except Exception:
            pass  # Text index exists with different name
            
        # organizations indexes
        db.organizations.create_index("id", unique=True)
        db.organizations.create_index("user_id", unique=True)
        
        # requisitions indexes
        db.requisitions.create_index("id", unique=True)
        db.requisitions.create_index("organization_id")
        
        # projects indexes
        db.projects.create_index("id", unique=True)
        db.projects.create_index("organization_id")
        
        # opportunities indexes
        db.opportunities.create_index("id", unique=True)
        db.opportunities.create_index("candidate_id")
        db.opportunities.create_index("employer_id")
        db.opportunities.create_index("project_id")

        
        print("MongoDB indexes created/verified successfully.")
    except Exception as e:
        print(f"[WARN] Index creation encountered an issue: {e}")

def seed_db():
    # Deprecated mock seeder - seeding is handled entirely by the ingestion pipeline run_ingestion()
    pass

