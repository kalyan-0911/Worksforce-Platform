from app.database import get_db

class CandidateRepository:
    @staticmethod
    def get_all(query=None):
        db = get_db()
        q = query or {}
        return list(db.candidates.find(q, {"_id": 0}))

    @staticmethod
    def get_by_id(prof_id):
        db = get_db()
        return db.candidates.find_one({"id": prof_id}, {"_id": 0})

    @staticmethod
    def create(cand_doc):
        db = get_db()
        db.candidates.insert_one(cand_doc)
        return cand_doc

    @staticmethod
    def update(prof_id, update_data):
        db = get_db()
        db.candidates.update_one({"id": prof_id}, {"$set": update_data})

    @staticmethod
    def count(query=None):
        db = get_db()
        q = query or {}
        return db.candidates.count_documents(q)

    @staticmethod
    def add_skill(prof_id, skill_name):
        db = get_db()
        db.candidates.update_one(
            {"id": prof_id},
            {"$addToSet": {"skills": {"name": skill_name, "verified": True}}}
        )

    @staticmethod
    def increment_readiness(prof_id, amount):
        db = get_db()
        c = CandidateRepository.get_by_id(prof_id)
        if c:
            new_score = min(100, c.get('readiness_score', 75) + amount)
            db.candidates.update_one({"id": prof_id}, {"$set": {"readiness_score": new_score}})
