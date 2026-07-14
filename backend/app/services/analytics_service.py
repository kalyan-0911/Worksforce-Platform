from app.repositories import ProjectRepository, RequisitionRepository, CandidateRepository

class AnalyticsService:
    @staticmethod
    def get_metrics():
        active_proj = ProjectRepository.count({"status": "Active"})
        open_reqs = RequisitionRepository.count({"status": {"$ne": "Completed"}})
        total_talent = CandidateRepository.count({})
        bench_count = CandidateRepository.count({"status": "Bench"})

        util_rate = 0.0
        if total_talent > 0:
            util_rate = ((total_talent - bench_count) / total_talent) * 100

        return {
            "activeProjects": active_proj,
            "openRequisitions": open_reqs,
            "utilizationRate": f"{util_rate:.1f}%"
        }
