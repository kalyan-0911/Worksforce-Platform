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

@organizations_bp.route('/organizations/me', methods=['GET', 'POST'])
@token_required
@role_required(['Employer', 'Admin'])
def get_my_organization(current_user):
    try:
        db = get_db()
        if request.method == 'POST':
            data = request.json or {}
            update_data = {}
            for field in ['company_name', 'industry', 'location', 'company_size', 'website', 'description', 'hiring_status']:
                if field in data:
                    update_data[field] = data[field]
            
            db.organizations.update_one(
                {"user_id": current_user['id']},
                {"$set": update_data},
                upsert=True
            )
            return jsonify({'message': 'Organization details updated successfully.', 'organization': update_data}), 200
        else:
            org = db.organizations.find_one({"user_id": current_user['id']}, {"_id": 0})
            if not org:
                return jsonify({'error': 'Organization not found for current user.'}), 404
            
            # Format the response to include the internal_dataset fields at the top level
            # This matches the shape expected by the frontend's Employer Dashboard
            if 'internal_dataset' in org:
                dataset = org.pop('internal_dataset')
                org.update(dataset)
                
            return jsonify(org)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@organizations_bp.route('/organizations/public', methods=['GET'])
def get_public_organizations():
    try:
        db = get_db()
        # Return only public fields
        orgs = list(db.organizations.find(
            {}, 
            {"_id": 0, "user_id": 1, "company_name": 1, "industry": 1, "location": 1, "company_size": 1, "verified": 1, "hiring_status": 1, "public_hiring_metrics": 1}
        ))
        return jsonify(orgs)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@organizations_bp.route('/organizations/public/<id>', methods=['GET'])
def get_public_organization(id):
    try:
        db = get_db()
        org = db.organizations.find_one(
            {"$or": [{"user_id": id}, {"company_name": id}]}, 
            {"_id": 0, "company_name": 1, "industry": 1, "location": 1, "company_size": 1, "verified": 1, "hiring_status": 1, "public_hiring_metrics": 1, "internal_dataset": 1}
        )
        if not org:
            return jsonify({'error': 'Organization not found.'}), 404
        
        # Clean up internal_dataset to only expose public-friendly description/stack
        dataset = org.pop('internal_dataset', {})
        org['description'] = f"A {org.get('company_size', 'growing')} company in the {org.get('industry', 'technology')} sector."
        org['tech_stack'] = dataset.get('internal_skills', [])
        
        return jsonify(org)
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
        
        upload_type = request.form.get('type', 'employee')
        db = get_db()
        
        # Parse using pandas
        if filename.endswith('.csv'):
            df = pd.read_csv(filepath)
        else:
            df = pd.read_excel(filepath)
            
        if upload_type == 'company':
            # Company Profile (Key-Value) parsing
            # Assumes format: Metric/Field, Value
            # Attempt to find the column with the values
            if len(df.columns) >= 2:
                # Lowercase and strip column names for robust matching
                key_col = df.columns[0]
                val_col = df.columns[1]
                
                updates = {}
                for _, row in df.iterrows():
                    key = str(row[key_col]).lower().strip()
                    val = str(row[val_col]).strip()
                    
                    if 'name' in key and 'organization' in key or 'company name' in key:
                        updates['company_name'] = val
                    elif 'industry' in key or 'sector' in key:
                        updates['industry'] = val
                    elif 'size' in key or 'employee count' in key:
                        updates['company_size'] = val
                    elif 'location' in key or 'headquarters' in key:
                        updates['location'] = val
                        
                if updates:
                    db.organizations.update_one(
                        {"user_id": current_user['id']},
                        {"$set": updates}
                    )
            
            return jsonify({
                'message': 'Company profile updated successfully from dataset.',
                'summary': {'dataset_filename': filename, 'employee_count': 'N/A (Profile Update)'}
            })
            
        else:
            # Employee Roster extraction
            cols = [c.lower() for c in df.columns]
            
            dept_col = next((c for c in df.columns if 'department' in c.lower() or 'dept' in c.lower()), None)
            departments = df[dept_col].dropna().unique().tolist() if dept_col else []
            
            skills_col = next((c for c in df.columns if 'skill' in c.lower() or 'tech' in c.lower()), None)
            skills_set = set()
            if skills_col:
                for val in df[skills_col].dropna():
                    for s in str(val).split(','):
                        skills_set.add(s.strip())
            skills = list(skills_set)
            
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
