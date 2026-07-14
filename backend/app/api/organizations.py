import os
import pandas as pd
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from app.database import get_db
from app.middleware import token_required, role_required

organizations_bp = Blueprint('organizations', __name__)

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

ALLOWED_EXTENSIONS = {'csv', 'xlsx'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@organizations_bp.route('/organizations/public', methods=['GET'])
def get_public_organizations():
    try:
        db = get_db()
        # Return only public fields
        orgs = list(db.organizations.find(
            {}, 
            {"_id": 0, "company_name": 1, "industry": 1, "location": 1, "company_size": 1}
        ))
        return jsonify(orgs)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@organizations_bp.route('/organizations/upload', methods=['POST'])
@token_required
@role_required(['Employer', 'Admin'])
def upload_dataset(current_user):
    if 'file' not in request.files:
        return jsonify({'error': 'No file part in the request'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
        
    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type. Only CSV and XLSX are allowed.'}), 400
        
    try:
        filename = secure_filename(file.filename)
        filepath = os.path.join(UPLOAD_FOLDER, f"{current_user['id']}_{filename}")
        file.save(filepath)
        
        # Parse using pandas
        if filename.endswith('.csv'):
            df = pd.read_csv(filepath)
        else:
            df = pd.read_excel(filepath)
            
        # Basic extraction
        # Handle columns dynamically if they exist, or use generic extraction
        cols = [c.lower() for c in df.columns]
        
        # Try to find department column
        dept_col = next((c for c in df.columns if 'department' in c.lower() or 'dept' in c.lower()), None)
        departments = df[dept_col].dropna().unique().tolist() if dept_col else []
        
        # Try to find skills/technologies
        skills_col = next((c for c in df.columns if 'skill' in c.lower() or 'tech' in c.lower()), None)
        skills_set = set()
        if skills_col:
            for val in df[skills_col].dropna():
                for s in str(val).split(','):
                    skills_set.add(s.strip())
        skills = list(skills_set)
        
        # Try to find role/experience
        role_col = next((c for c in df.columns if 'role' in c.lower() or 'title' in c.lower()), None)
        workforce_distribution = {}
        if role_col:
            workforce_distribution = df[role_col].value_counts().to_dict()
            
        employee_count = len(df)
        
        dataset_summary = {
            "departments": departments,
            "employee_count": employee_count,
            "internal_skills": skills,
            "workforce_distribution": workforce_distribution,
            "dataset_filename": filename,
            "status": "Processed"
        }
        
        # Update organization
        db = get_db()
        db.organizations.update_one(
            {"user_id": current_user['id']},
            {"$set": {"internal_dataset": dataset_summary}}
        )
        
        return jsonify({
            'message': 'Dataset uploaded and processed successfully.',
            'summary': dataset_summary
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
