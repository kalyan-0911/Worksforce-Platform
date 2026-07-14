import os
from pathlib import Path

# Load .env from backend/ directory automatically
_backend_dir = Path(__file__).resolve().parent.parent.parent  # backend/
_env_file = _backend_dir / ".env"
if _env_file.exists():
    with open(_env_file) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if '=' in line:
                key, val = line.split('=', 1)
                os.environ.setdefault(key.strip(), val.strip().strip("'\""))


class Config:
    MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017/")
    DATABASE_NAME = os.environ.get("DATABASE_NAME", "workforcex")
    JWT_SECRET = os.environ.get("JWT_SECRET", "workforcex_secret_jwt_key_signature")
    JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    ENVIRONMENT = os.environ.get("ENVIRONMENT", "development")
    GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
