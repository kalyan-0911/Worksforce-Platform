from app.database import get_db

class UserRepository:
    @staticmethod
    def get_by_email(email):
        db = get_db()
        return db.users.find_one({"email": email})

    @staticmethod
    def create(user_doc):
        db = get_db()
        db.users.insert_one(user_doc)
        return user_doc
