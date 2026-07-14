from app.repositories import ProjectRepository, CandidateRepository

class ProjectService:
    @staticmethod
    def deploy_squad(name, member_ids, employer_id):
        if not name or not member_ids:
            raise ValueError("Project name and memberIds are required.")

        proj_id = f"PROJ-{ProjectRepository.count({}) + 1:03d}"
        
        member_profiles = []
        for m_id in member_ids:
            c = CandidateRepository.get_by_id(m_id)
            if c:
                member_profiles.append({
                    "id": c["id"],
                    "name": c["name"],
                    "role": c["target_role"]
                })
                # Set status to engaged
                CandidateRepository.update(m_id, {"status": "Engaged"})

        new_project = {
            "id": proj_id,
            "name": name,
            "size": len(member_ids),
            "status": "Active",
            "employer_id": employer_id,
            "members": member_profiles
        }
        ProjectRepository.create(new_project)
        return new_project
