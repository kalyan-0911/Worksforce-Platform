import os
import sys
import logging
from pathlib import Path
from dotenv import load_dotenv

# Set up simple logging for configuration warning alerts
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load .env from backend/ directory automatically
_backend_dir = Path(__file__).resolve().parent.parent.parent  # backend/
_env_file = _backend_dir / ".env"
if _env_file.exists():
    load_dotenv(dotenv_path=_env_file)
else:
    logger.warning(f".env file not found at: {_env_file}")


class Config:
    ENVIRONMENT = os.environ.get("ENVIRONMENT", "development")
    
    MONGO_URI = os.environ.get("MONGO_URI")
    if not MONGO_URI:
        raise ValueError("Critical Configuration Error: MONGO_URI is missing or not set in the environment variables.")
        
    DATABASE_NAME = os.environ.get("DATABASE_NAME", "workforcex")
    
    # Secret validation
    jwt_secret_env = os.environ.get("JWT_SECRET")
    if ENVIRONMENT == "production":
        if not jwt_secret_env or jwt_secret_env == "workforcex_secret_jwt_key_signature":
            raise ValueError("Critical Security Error: A default or missing JWT_SECRET is not allowed in production mode.")
        JWT_SECRET = jwt_secret_env
    else:
        if not jwt_secret_env:
            logger.warning("JWT_SECRET is not configured in development. Using insecure fallback key.")
            JWT_SECRET = "workforcex_secret_jwt_key_signature"
        else:
            JWT_SECRET = jwt_secret_env

    JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    
    GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
    if not GROQ_API_KEY:
        logger.warning("GROQ_API_KEY is not configured in the environment. AI explanations and resume parsing features will fail.")
        GROQ_API_KEY = ""
