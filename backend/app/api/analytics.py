from flask import Blueprint, jsonify
from app.database import get_db
from app.middleware import token_required

analytics_bp = Blueprint('analytics', __name__)


def _get_db():
    from app.database import get_db
    return get_db()


@analytics_bp.route('/analytics', methods=['GET'])
@token_required
def get_analytics(current_user):
    """Platform-level utilization metrics."""
    try:
        db = _get_db()
        active_proj  = db.projects.count_documents({"status": "Active"})
        open_reqs    = db.requisitions.count_documents({"status": {"$ne": "Completed"}})
        total_talent = db.candidates.count_documents({})
        bench_count  = db.candidates.count_documents({"status": "Bench"})
        training_count = db.candidates.count_documents({"status": "Training"})
        engaged_count  = db.candidates.count_documents({"status": "Engaged"})

        util_rate = round(((total_talent - bench_count) / total_talent) * 100, 1) if total_talent else 0.0

        return jsonify({
            "activeProjects":   active_proj,
            "openRequisitions": open_reqs,
            "totalTalent":      total_talent,
            "benchCount":       bench_count,
            "trainingCount":    training_count,
            "engagedCount":     engaged_count,
            "utilizationRate":  f"{util_rate}%",
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@analytics_bp.route('/analytics/departments', methods=['GET'])
@token_required
def department_breakdown(current_user):
    """Department breakdown from real employee dataset."""
    try:
        db = _get_db()
        pipeline = [
            {"$group": {"_id": "$department", "count": {"$sum": 1},
                        "avg_readiness": {"$avg": "$readiness_score"}}},
            {"$sort": {"count": -1}},
            {"$project": {
                "_id": 0,
                "department": "$_id",
                "count": 1,
                "avg_readiness": {"$round": ["$avg_readiness", 1]}
            }},
        ]
        result = list(db.candidates.aggregate(pipeline))
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@analytics_bp.route('/analytics/performance', methods=['GET'])
@token_required
def performance_distribution(current_user):
    """Performance score distribution from employee data."""
    try:
        db = _get_db()
        pipeline = [
            {"$group": {"_id": "$training.outcome", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$project": {"_id": 0, "outcome": "$_id", "count": 1}},
        ]
        result = list(db.candidates.aggregate(pipeline))

        # Also pull raw performance from employees collection
        perf_pipeline = [
            {"$group": {"_id": "$performance_score", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$project": {"_id": 0, "performance": "$_id", "count": 1}},
        ]
        perf_result = list(db.employees.aggregate(perf_pipeline))

        return jsonify({
            "training_outcomes":     result,
            "performance_scores":    perf_result,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@analytics_bp.route('/analytics/training', methods=['GET'])
@token_required
def training_analysis(current_user):
    """Training program cost and outcome analysis from real data."""
    try:
        db = _get_db()

        # Top training programs by cost
        cost_pipeline = [
            {"$match": {"training.cost": {"$gt": 0}}},
            {"$group": {
                "_id": "$training.program_name",
                "total_cost": {"$sum": "$training.cost"},
                "avg_cost":   {"$avg": "$training.cost"},
                "count":      {"$sum": 1},
            }},
            {"$sort": {"total_cost": -1}},
            {"$limit": 10},
            {"$project": {
                "_id": 0,
                "program": "$_id",
                "total_cost": {"$round": ["$total_cost", 2]},
                "avg_cost":   {"$round": ["$avg_cost", 2]},
                "count": 1,
            }},
        ]
        programs = list(db.employees.aggregate(cost_pipeline))

        # Outcome rates
        outcome_pipeline = [
            {"$match": {"training.outcome": {"$ne": None}}},
            {"$group": {"_id": "$training.outcome", "count": {"$sum": 1}}},
            {"$project": {"_id": 0, "outcome": "$_id", "count": 1}},
        ]
        outcomes = list(db.employees.aggregate(outcome_pipeline))

        # Avg training duration
        duration_pipeline = [
            {"$match": {"training.duration_days": {"$gt": 0}}},
            {"$group": {"_id": None, "avg_days": {"$avg": "$training.duration_days"}}},
        ]
        dur_result = list(db.employees.aggregate(duration_pipeline))
        avg_duration = round(dur_result[0]["avg_days"], 1) if dur_result else 0

        return jsonify({
            "top_programs":    programs,
            "outcomes":        outcomes,
            "avg_duration_days": avg_duration,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@analytics_bp.route('/analytics/cohorts', methods=['GET'])
@token_required
def cohort_distribution(current_user):
    """Cohort and track distribution across all candidates."""
    try:
        db = _get_db()
        pipeline = [
            {"$group": {
                "_id": "$training.cohort_code",
                "track": {"$first": "$training.track"},
                "count": {"$sum": 1},
                "avg_readiness": {"$avg": "$readiness_score"},
                "avg_progress":  {"$avg": "$training.progress_percentage"},
            }},
            {"$sort": {"count": -1}},
            {"$project": {
                "_id": 0,
                "cohort_code": "$_id",
                "track": 1,
                "count": 1,
                "avg_readiness": {"$round": ["$avg_readiness", 1]},
                "avg_progress":  {"$round": ["$avg_progress", 1]},
            }},
        ]
        result = list(db.candidates.aggregate(pipeline))
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
