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

    def optimize_team_squad(self, required_roles, bench_candidates):
        """
        Calculates the best matching candidates for a list of required roles.
        Ensures no double-allocations (greedy bipartite matching solver).
        
        required_roles: list of strings (e.g. ['Solutions Architect', 'Data Engineer'])
        bench_candidates: list of dicts, each with keys:
                          'id', 'name', 'role', 'readiness_score', 'skills'
        """
        allocated_ids = set()
        recommended_squad = []
        unassigned_slots = []
        total_score = 0
        assigned_count = 0

        for target_role in required_roles:
            best_candidate = None
            best_score = -1

            for c in bench_candidates:
                if c['id'] in allocated_ids:
                    continue

                # 1. Calculate role suitability score
                c_role_lower = c['role'].lower()
                target_lower = target_role.lower()

                role_score = 0
                if c_role_lower == target_lower:
                    role_score = 100
                elif target_lower in c_role_lower or c_role_lower in target_lower:
                    role_score = 60
                elif any(word in c_role_lower for word in target_lower.split() if len(word) > 3):
                    role_score = 30

                # 2. Weighted overall score (70% role suitability + 30% candidate readiness index)
                overall_score = round((role_score * 0.7) + (c['readiness_score'] * 0.3))

                if overall_score > best_score:
                    best_score = overall_score
                    best_candidate = c
            
            if best_candidate and best_score >= 20: # Threshold suitability to match
                allocated_ids.add(best_candidate['id'])
                recommended_squad.append({
                    'role_slot': target_role,
                    'professional': best_candidate,
                    'match_score': best_score
                })
                total_score += best_score
                assigned_count += 1
            else:
                unassigned_slots.append(target_role)

        avg_score = round(total_score / assigned_count) if assigned_count > 0 else 0

        return {
            'squad': recommended_squad,
            'unassigned_slots': unassigned_slots,
            'average_match_score': avg_score
        }

ai_engine_instance = AIEngine()
