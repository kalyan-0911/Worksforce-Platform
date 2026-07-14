import os
from app.repositories import CandidateRepository, RequisitionRepository

class AIService:
    @staticmethod
    def get_requisition_matches(req_id):
        req = RequisitionRepository.get_by_id(req_id)
        if not req:
            raise ValueError("Requisition not found.")

        required_skills = req.get('required_skills', [])
        bench_candidates = CandidateRepository.get_all({"status": "Bench"})

        matches = []
        for c in bench_candidates:
            cand_skills_list = [s['name'] for s in c.get('skills', [])]
            match_res = AIService.compute_match_score(
                cand_skills_list,
                c.get('readiness_score', 80),
                required_skills
            )
            matches.append({
                'id': c['id'],
                'name': c['name'],
                'role': c['target_role'],
                'matchScore': match_res['score'],
                'overlappingSkills': match_res['overlappingSkills'],
                'missingSkills': match_res['missingSkills']
            })

        # Sort descending by compatibility score
        matches.sort(key=lambda x: x['matchScore'], reverse=True)

        return {
            'requisition': req,
            'requiredSkills': required_skills,
            'matches': matches
        }

    @staticmethod
    def compute_match_score(candidate_skills, candidate_readiness, required_skills):
        if not required_skills:
            return {"score": 0, "overlappingSkills": [], "missingSkills": []}

        candidate_set = {s.lower() for s in candidate_skills}
        overlapping = []
        missing = []

        for skill in required_skills:
            if skill.lower() in candidate_set:
                overlapping.append(skill)
            else:
                missing.append(skill)

        # Jaccard Calculations
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

    @staticmethod
    def recommend_squad(required_roles):
        bench_rows = CandidateRepository.get_all({"status": "Bench"})
        
        bench_candidates = []
        for c in bench_rows:
            p = {
                'id': c['id'],
                'name': c['name'],
                'role': c['target_role'],
                'readiness_score': c['readiness_score'],
                'skills': [s['name'] for s in c.get('skills', [])]
            }
            bench_candidates.append(p)

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

                c_role_lower = c['role'].lower()
                target_lower = target_role.lower()

                role_score = 0
                if c_role_lower == target_lower:
                    role_score = 100
                elif target_lower in c_role_lower or c_role_lower in target_lower:
                    role_score = 60
                elif any(word in c_role_lower for word in target_lower.split() if len(word) > 3):
                    role_score = 30

                overall_score = round((role_score * 0.7) + (c['readiness_score'] * 0.3))

                if overall_score > best_score:
                    best_score = overall_score
                    best_candidate = c
            
            if best_candidate and best_score >= 20:
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
