from app.repositories import CandidateRepository, RequisitionRepository
from app.services import groq_service

class AIService:
    @staticmethod
    def get_requisition_matches(req_id):
        from app.services.ml_service import compute_match_scores, generate_candidate_text, generate_requirement_text
        
        req = RequisitionRepository.get_by_id(req_id)
        if not req:
            raise ValueError("Requisition not found.")

        # Normalize skills list
        required_skills = [s['name'] if isinstance(s, dict) else s for s in req.get('required_skills', [])]
        bench_candidates = CandidateRepository.get_all({"status": "Bench"})

        if not bench_candidates:
            return {
                'requisition': req,
                'requiredSkills': required_skills,
                'matches': []
            }

        # Generate texts for all candidates and the requirement
        r_text = generate_requirement_text(req)
        candidate_texts = [generate_candidate_text(c) for c in bench_candidates]
        
        # Batch compute all scores instantly
        ml_scores = compute_match_scores(r_text, candidate_texts)
        
        scored_candidates = []
        for i, c in enumerate(bench_candidates):
            base_score = ml_scores[i] * 100
            readiness_score = c.get('readiness_score', 80)
            
            # Combine ML score and Readiness score
            final_score = min(100, round((base_score * 0.7) + (readiness_score * 0.3)))
            
            cand_skills_list = [s['name'] for s in c.get('skills', [])]
            candidate_set = {s.lower() for s in cand_skills_list}
            overlapping = [s for s in required_skills if s.lower() in candidate_set]
            missing = [s for s in required_skills if s.lower() not in candidate_set]

            # Only include candidates meeting a minimum threshold (e.g. 30%)
            if final_score >= 30:
                scored_candidates.append({
                    'candidate': c,
                    'score': final_score,
                    'overlappingSkills': overlapping,
                    'missingSkills': missing
                })

        # Sort descending by local compatibility score
        scored_candidates.sort(key=lambda x: x['score'], reverse=True)

        # Slice the top N to avoid Groq rate limits
        target_size = req.get('team_size', 3)
        top_candidates = scored_candidates[:target_size + 5]

        matches = []
        for sc in top_candidates:
            c = sc['candidate']
            
            job_mock = {
                'title': req.get('role', 'Role'),
                'company': 'WorkForceX',
                'location': 'Remote',
                'skills': required_skills
            }
            
            try:
                explanation = groq_service.explain_match(c, job_mock, sc['score'])
            except Exception:
                explanation = f"AI matched this candidate based on a {sc['score']}% fit with the role requirements."

            matches.append({
                'id': c['id'],
                'name': c['name'],
                'role': c.get('target_role', c.get('role', c.get('title', 'Unknown'))),
                'matchScore': sc['score'],
                'overlappingSkills': sc['overlappingSkills'],
                'missingSkills': sc['missingSkills'],
                'explanation': explanation
            })

        return {
            'requisition': req,
            'requiredSkills': required_skills,
            'matches': matches
        }

    @staticmethod
    def compute_match_score(candidate, req, required_skills, candidate_skills):
        from app.services.ml_service import compute_match_scores, generate_candidate_text, generate_requirement_text
        
        c_text = generate_candidate_text(candidate)
        r_text = generate_requirement_text(req)
        
        base_scores = compute_match_scores(r_text, [c_text])
        base_score = base_scores[0] * 100 if base_scores else 0
        
        # Readiness Score Tier Bonus
        readiness_score = candidate.get('readiness_score', 80)
        
        # Combine ML base score with readiness score (60% ML, 40% Readiness)
        final_score = min(100, round((base_score * 0.6) + (readiness_score * 0.4)))
        
        candidate_set = {s.lower() for s in candidate_skills}
        overlapping = [s for s in required_skills if s.lower() in candidate_set]
        missing = [s for s in required_skills if s.lower() not in candidate_set]

        return {
            "score": final_score,
            "overlappingSkills": overlapping,
            "missingSkills": missing
        }

    @staticmethod
    def recommend_squad(required_roles):
        from app.services.ml_service import compute_match_scores, generate_candidate_text
        
        bench_rows = CandidateRepository.get_all({"status": "Bench"})
        
        bench_candidates = []
        for c in bench_rows:
            p = {
                'id': c['id'],
                'name': c['name'],
                'role': c.get('target_role', c.get('role', c.get('title', 'Unknown'))),
                'readiness_score': c.get('readiness_score', 80),
                'skills': [s['name'] for s in c.get('skills', [])]
            }
            p['ml_text'] = generate_candidate_text(c)
            bench_candidates.append(p)

        allocated_ids = set()
        recommended_squad = []
        unassigned_slots = []
        total_score = 0
        assigned_count = 0

        for target_role in required_roles:
            best_candidate = None
            best_score = -1

            candidate_texts = [c['ml_text'] for c in bench_candidates]
            ml_scores = compute_match_scores(target_role, candidate_texts)

            for i, c in enumerate(bench_candidates):
                if c['id'] in allocated_ids:
                    continue

                base_ml_score = ml_scores[i] * 100
                overall_score = min(100, round((base_ml_score * 0.7) + (c['readiness_score'] * 0.3)))

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

    @staticmethod
    def get_reverse_matches(candidate_id, top_n=5):
        from app.services.ml_service import compute_match_scores, generate_candidate_text, generate_requirement_text
        from app.database import get_db
        from app.services import groq_service
        
        db = get_db()
        candidate = CandidateRepository.get_by_id(candidate_id)
        if not candidate:
            raise ValueError("Candidate not found.")
            
        c_text = generate_candidate_text(candidate)
        cand_skills = [s['name'] if isinstance(s, dict) else s for s in candidate.get('skills', [])]
        
        # Get active job postings/requirements from db (limit to recent 500 for perf in MVP)
        jobs_cursor = db.job_postings.find().sort('_id', -1).limit(500)
        jobs = list(jobs_cursor)
        
        job_texts = [generate_requirement_text(job) for job in jobs]
        ml_scores = compute_match_scores(c_text, job_texts)
        
        matches = []
        for i, job in enumerate(jobs):
            base_score = ml_scores[i] * 100
            if base_score > 10:  # arbitrary threshold
                readiness_score = candidate.get('readiness_score', 80)
                final_score = min(100, round((base_score * 0.6) + (readiness_score * 0.4)))
                
                job_skills = job.get('skills', [])
                overlap = [s for s in cand_skills if s in job_skills]
                missing = [s for s in job_skills if s not in cand_skills]
                
                matches.append({
                    'job_id': job.get('job_id') or str(job.get('_id')),
                    'title': job.get('title', job.get('role', 'Unknown Role')),
                    'company': job.get('company', 'Unknown Company'),
                    'location': job.get('location', 'Remote'),
                    'matchScore': final_score,
                    'overlap_skills': overlap[:5],
                    'missing_skills': missing[:3],
                    '_job': job,  # temp, for explanation
                })
                
        matches.sort(key=lambda x: x['matchScore'], reverse=True)
        top = matches[:top_n]
        
        # Generate Groq explanations for top matches
        for m in top:
            job = m.pop('_job', {})
            readiness_score = candidate.get('readiness_score', 80)
            try:
                explanation = groq_service.explain_match(candidate, job, m['matchScore'])
            except Exception:
                skills = m.get('overlap_skills', [])
                if skills:
                    explanation = f"This role matches your profile because you have {', '.join(skills[:3])} skills which are required. Your {readiness_score}% readiness score positions you well for this opportunity."
                else:
                    explanation = f"Based on your profile and {readiness_score}% readiness score, this role aligns with your career trajectory."
            m['explanation'] = explanation
        
        return top
