from app.repositories import CandidateRepository
from app.repositories.job_postings_repo import JobPostingsRepository
from app.services import groq_service

TRACK_TO_COHORT = {
    "React Full-Stack":      "COHORT-2026-REACT",
    "Machine Learning & AI": "COHORT-2026-ML",
    "Cloud DevOps":          "COHORT-2026-CLOUDOPS",
    "Data Engineering":      "COHORT-2026-DATA",
    "General Engineering":   "COHORT-2026-GENERAL",
}

COHORT_TRAINERS = {
    "COHORT-2026-REACT":    {"trainer": "Marcus Aurelius"},
    "COHORT-2026-ML":       {"trainer": "Ada Lovelace"},
    "COHORT-2026-CLOUDOPS": {"trainer": "Grace Hopper"},
    "COHORT-2026-DATA":     {"trainer": "Alan Turing"},
    "COHORT-2026-GENERAL":  {"trainer": "Linus Torvalds"},
}

TRACK_SKILLS = {
    "COHORT-2026-REACT":    ["React", "TypeScript", "Next.js", "Node.js", "Docker"],
    "COHORT-2026-ML":       ["Python", "PyTorch", "TensorFlow", "Scikit-Learn", "NLP"],
    "COHORT-2026-CLOUDOPS": ["AWS", "Kubernetes", "Docker", "Terraform", "CI/CD"],
    "COHORT-2026-DATA":     ["SQL", "Python", "Spark", "ETL", "PostgreSQL"],
    "COHORT-2026-GENERAL":  ["Communication", "Project Management", "Agile", "Git"],
}

TRACK_ASSESSMENTS = {
    "COHORT-2026-REACT":    [{"id": "react-arch", "title": "React Architecture & Patterns"}],
    "COHORT-2026-ML":       [{"id": "python-ml",  "title": "Python & Machine Learning"}],
    "COHORT-2026-CLOUDOPS": [{"id": "cloud-devops","title": "Cloud & DevOps Fundamentals"},
                              {"id": "security-audit", "title": "Enterprise Security Auditing"}],
    "COHORT-2026-DATA":     [{"id": "data-engineering", "title": "Data Engineering & SQL"}],
    "COHORT-2026-GENERAL":  [{"id": "react-arch", "title": "React Architecture & Patterns"}],
}


class CandidateService:

    @staticmethod
    def process_resume(resume_text: str, prof_id: str) -> dict:
        """
        Parse resume using Groq AI (with regex fallback).
        Updates candidate profile in MongoDB and returns structured result.
        """
        # Step 1: Parse resume via Groq
        parsed = groq_service.parse_resume(resume_text)

        # Step 2: Map suggested track to cohort
        suggested_track = parsed.get("suggested_track", "General Engineering")
        cohort_code = TRACK_TO_COHORT.get(suggested_track, "COHORT-2026-GENERAL")
        trainer_info = COHORT_TRAINERS[cohort_code]
        track_required_skills = TRACK_SKILLS[cohort_code]

        # Step 3: Build skills list
        raw_skills = parsed.get("skills", [])
        skills_formatted = [{"name": s, "verified": False} for s in raw_skills if s]

        # Step 4: Identify missing skills for this track
        candidate_skill_names = {s.lower() for s in raw_skills}
        missing_skills = [
            s for s in track_required_skills
            if s.lower() not in candidate_skill_names
        ]

        # Step 5: Get recommended assessments
        recommended_assessments = TRACK_ASSESSMENTS.get(cohort_code, [])

        # Step 6: Update candidate profile in MongoDB
        update_fields = {
            "status": "Training",
            "skills": skills_formatted,
            "training": {
                "cohort_code": cohort_code,
                "track": suggested_track,
                "trainer": trainer_info["trainer"],
                "progress_percentage": 10,
                "mock_project_score": 0,
            },
            "onboarded": True,
        }
        if parsed.get("current_title"):
            update_fields["title"] = parsed["current_title"]

        CandidateRepository.update(prof_id, update_fields)
        candidate = CandidateRepository.get_by_id(prof_id)

        # Step 7: Generate readiness narrative via Groq
        readiness_narrative = groq_service.generate_readiness_narrative(candidate)

        return {
            "candidate": candidate,
            "parsed_profile": {
                "name":         parsed.get("name"),
                "email":        parsed.get("email"),
                "summary":      parsed.get("summary"),
                "education":    parsed.get("education"),
                "experience_years": parsed.get("total_experience_years"),
                "key_strengths": parsed.get("key_strengths", []),
                "areas_to_improve": parsed.get("areas_to_improve", []),
            },
            "recommendations": {
                "cohort_code":             cohort_code,
                "track":                   suggested_track,
                "missing_skills":          missing_skills,
                "recommended_assessments": recommended_assessments,
                "readiness_narrative":     readiness_narrative,
            },
        }

    @staticmethod
    def get_job_recommendations(prof_id: str, limit: int = 10) -> list:
        """
        Return ranked job postings for a candidate based on their verified skills.
        Adds a match_score and Groq-generated explanation for each job.
        """
        candidate = CandidateRepository.get_by_id(prof_id)
        if not candidate:
            return []

        candidate_skills = [s["name"] for s in candidate.get("skills", [])]
        jobs = JobPostingsRepository.recommend_for_candidate(candidate_skills, limit=limit)

        result = []
        for job in jobs:
            job_skills = job.get("skills", [])
            overlap = [s for s in candidate_skills if s in job_skills]
            missing = [s for s in job_skills if s not in candidate_skills]

            # Compute match score: weighted skill overlap
            if job_skills:
                skill_pct = len(overlap) / len(job_skills) * 100
            else:
                skill_pct = 0
            readiness = candidate.get("readiness_score", 75)
            match_score = round(skill_pct * 0.7 + readiness * 0.3)

            result.append({
                "job":             job,
                "match_score":     match_score,
                "overlap_skills":  overlap,
                "missing_skills":  missing,
            })

        # Sort by match score descending
        result.sort(key=lambda x: x["match_score"], reverse=True)
        return result

    @staticmethod
    def get_career_path(prof_id: str) -> dict:
        """Return Groq-generated career path recommendation for a candidate."""
        candidate = CandidateRepository.get_by_id(prof_id)
        if not candidate:
            return {}
        return groq_service.recommend_career_path(candidate)
