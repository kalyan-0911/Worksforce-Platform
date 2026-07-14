import os

class AIEngine:
    def __init__(self, provider=None):
        self.provider = provider or os.environ.get('AI_PROVIDER', 'local')

    def compute_match_score(self, candidate_skills, candidate_readiness, required_skills):
        if self.provider == 'local':
            return self._local_match_engine(candidate_skills, candidate_readiness, required_skills)
        
        # Future LLM integrations placeholder
        return self._local_match_engine(candidate_skills, candidate_readiness, required_skills)

    def _local_match_engine(self, candidate_skills, candidate_readiness, required_skills):
        if not required_skills:
            return {"score": 0, "overlappingSkills": [], "missingSkills": []}

        candidate_set = {s.lower() for s in candidate_skills}
        required_set = {s.lower() for s in required_skills}

        overlapping = []
        missing = []

        for skill in required_skills:
            if skill.lower() in candidate_set:
                overlapping.append(skill)
            else:
                missing.append(skill)

        # Jaccard calculations
        intersection_count = len(overlapping)
        union_set = set(candidate_skills) | set(required_skills)
        union_count = len(union_set)
        jaccard_index = intersection_count / union_count if union_count > 0 else 0

        # Weighted compatibility algorithm
        skill_score = jaccard_index * 100
        final_score = round((skill_score * 0.6) + (candidate_readiness * 0.4))

        return {
            "score": final_score,
            "overlappingSkills": overlapping,
            "missingSkills": missing
        }

ai_engine_instance = AIEngine()
