from app.database import get_db

class AssessmentRepository:
    @staticmethod
    def get_all():
        db = get_db()
        return list(db.assessments.find({}, {"_id": 0}))

    @staticmethod
    def get_by_id(test_id):
        db = get_db()
        return db.assessments.find_one({"id": test_id}, {"_id": 0})

    @staticmethod
    def create(assessment_doc):
        db = get_db()
        db.assessments.insert_one(assessment_doc)
        return assessment_doc

    @staticmethod
    def log_submission(submission_doc):
        db = get_db()
        db.assessment_submissions.insert_one(submission_doc)
        return submission_doc
