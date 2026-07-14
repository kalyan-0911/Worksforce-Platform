from app.database import get_db

class JobPostingsRepository:
    @staticmethod
    def search(skill_filter=None, location=None, title_query=None,
               exp_min=None, exp_max=None, page=1, per_page=20):
        db = get_db()
        query = {}

        if skill_filter:
            query["skills"] = {"$in": skill_filter if isinstance(skill_filter, list) else [skill_filter]}
        if location:
            query["location"] = {"$regex": location, "$options": "i"}
        if title_query:
            query["title"] = {"$regex": title_query, "$options": "i"}
        if exp_min is not None:
            query["experience_max"] = {"$gte": exp_min}
        if exp_max is not None:
            query["experience_min"] = {"$lte": exp_max}

        skip = (page - 1) * per_page
        total = db.job_postings.count_documents(query)
        jobs  = list(db.job_postings.find(query, {"_id": 0}).skip(skip).limit(per_page))
        return {"jobs": jobs, "total": total, "page": page, "per_page": per_page}

    @staticmethod
    def get_by_id(job_id: str):
        db = get_db()
        return db.job_postings.find_one({"job_id": job_id}, {"_id": 0})

    @staticmethod
    def get_top_skills(limit=10):
        db = get_db()
        pipeline = [
            {"$unwind": "$skills"},
            {"$group": {"_id": "$skills", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": limit},
        ]
        return [{"skill": r["_id"], "count": r["count"]}
                for r in db.job_postings.aggregate(pipeline)]

    @staticmethod
    def recommend_for_candidate(candidate_skills: list, limit=10):
        """Return job postings that match at least one of the candidate's skills, ranked by overlap."""
        db = get_db()
        if not candidate_skills:
            return list(db.job_postings.find({}, {"_id": 0}).limit(limit))

        pipeline = [
            {"$match": {"skills": {"$in": candidate_skills}}},
            {"$addFields": {
                "overlap_count": {
                    "$size": {
                        "$setIntersection": ["$skills", candidate_skills]
                    }
                }
            }},
            {"$sort": {"overlap_count": -1, "rating": -1}},
            {"$limit": limit},
            {"$project": {"_id": 0}},
        ]
        return list(db.job_postings.aggregate(pipeline))
