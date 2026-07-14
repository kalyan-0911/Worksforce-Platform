import sys, os
sys.path.insert(0, '.')
from pymongo import MongoClient
from pymongo.server_api import ServerApi

# Load env
env_path = os.path.join('.', '.env')
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                os.environ.setdefault(k.strip(), v.strip().strip("'\""))

uri = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/')
client = MongoClient(uri, server_api=ServerApi('1'))
db = client['workforcex']

print('=== COLLECTION COUNTS ===')
print('employees:   ', db.employees.count_documents({}))
print('candidates:  ', db.candidates.count_documents({}))
print('users:       ', db.users.count_documents({}))
print('job_postings:', db.job_postings.count_documents({}))
print('assessments: ', db.assessments.count_documents({}))

print()
print('=== SAMPLE CANDIDATE ===')
c = db.candidates.find_one({'status': 'Bench'}, {'_id': 0})
if c:
    print('  name:      ', c.get('name'))
    print('  title:     ', c.get('title'))
    print('  readiness: ', c.get('readiness_score'))
    print('  cohort:    ', c.get('training', {}).get('cohort_code'))
    skills = [s['name'] for s in c.get('skills', [])[:4]]
    print('  skills:    ', skills)

print()
print('=== SAMPLE JOB POSTING ===')
j = db.job_postings.find_one({}, {'_id': 0})
if j:
    print('  title:    ', j.get('title'))
    print('  company:  ', j.get('company'))
    print('  location: ', j.get('location'))
    print('  skills:   ', j.get('skills', [])[:5])
    print('  exp:      ', str(j.get('experience_min')) + '-' + str(j.get('experience_max')) + ' yrs')
    print('  salary:   ', str(j.get('salary_min')) + ' - ' + str(j.get('salary_max')) + ' INR')

print()
print('=== STATUS DISTRIBUTION ===')
for status in ['Bench', 'Training', 'Engaged']:
    count = db.candidates.count_documents({'status': status})
    print(' ', status + ':', count)

print()
print('=== TOP 5 DEPARTMENTS ===')
result = list(db.candidates.aggregate([
    {'$group': {'_id': '$department', 'count': {'$sum': 1}}},
    {'$sort': {'count': -1}},
    {'$limit': 5}
]))
for r in result:
    print(' ', str(r.get('_id', 'Unknown')) + ':', r.get('count'))

print()
print('=== TOP 5 JOB SKILLS ===')
result2 = list(db.job_postings.aggregate([
    {'$unwind': '$skills'},
    {'$group': {'_id': '$skills', 'count': {'$sum': 1}}},
    {'$sort': {'count': -1}},
    {'$limit': 5}
]))
for r in result2:
    print(' ', str(r.get('_id')) + ':', r.get('count'), 'job postings')
