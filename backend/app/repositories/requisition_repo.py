from app.database import get_db

class RequisitionRepository:
    @staticmethod
    def get_all(query=None):
        db = get_db()
        q = query or {}
        return list(db.requisitions.find(q, {"_id": 0}))

    @staticmethod
    def get_by_id(req_id):
        db = get_db()
        return db.requisitions.find_one({"id": req_id}, {"_id": 0})

    @staticmethod
    def create(requisition_doc):
        db = get_db()
        db.requisitions.insert_one(requisition_doc)
        return requisition_doc

    @staticmethod
    def count(query=None):
        db = get_db()
        q = query or {}
        return db.requisitions.count_documents(q)
