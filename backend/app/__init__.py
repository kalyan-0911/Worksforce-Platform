from flask import Flask
from flask_cors import CORS
from app.config import Config
from app.database import init_db, run_ingestion
from app.api import (
    auth_bp,
    candidates_bp,
    projects_bp,
    requisitions_bp,
    analytics_bp,
    assessments_bp,
)
from app.api.jobs import jobs_bp
from app.api.admin import admin_bp
from app.api.organizations import organizations_bp
from app.api.opportunities import opportunities_bp


def create_app():
    app = Flask(__name__)
    CORS(app)

    # Register all API blueprint routes
    app.register_blueprint(auth_bp,         url_prefix='/api/auth')
    app.register_blueprint(candidates_bp,   url_prefix='/api')
    app.register_blueprint(projects_bp,     url_prefix='/api')
    app.register_blueprint(requisitions_bp, url_prefix='/api')
    app.register_blueprint(analytics_bp,    url_prefix='/api')
    app.register_blueprint(assessments_bp,  url_prefix='/api')
    app.register_blueprint(jobs_bp,         url_prefix='/api')
    app.register_blueprint(admin_bp,        url_prefix='/api')
    app.register_blueprint(organizations_bp,url_prefix='/api')
    app.register_blueprint(opportunities_bp,url_prefix='/api')

    # Initialize indexes and run data ingestion pipeline on first boot
    try:
        init_db()
        run_ingestion()
    except Exception as e:
        print(f"[WARN] Startup database pipeline skipped: {e}")

    return app
