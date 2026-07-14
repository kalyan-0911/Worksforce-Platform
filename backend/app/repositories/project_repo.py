from app.database import get_db

class ProjectRepository:
    @staticmethod
    def get_all():
        db = get_db()
        return list(db.projects.find({}, {"_id": 0}))

    @staticmethod
    def get_by_id(proj_id):
        db = get_db()
        return db.projects.find_one({"id": proj_id}, {"_id": 0})

    @staticmethod
    def create(project_doc):
        db = get_db()
        db.projects.insert_one(project_doc)
        return project_doc

    @staticmethod
    def count(query=None):
        db = get_db()
        q = query or {}
        return db.projects.count_documents(q)
