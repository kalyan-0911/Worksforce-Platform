"""
WorkForceX — Groq AI Service
==============================
Wraps Groq LLM API calls for:
  1. Resume parsing & structured skill extraction
  2. Job–candidate match score explanation
  3. Career path recommendations
  4. Skill demand trend analysis
  5. Readiness score narrative generation

Uses llama-3.1-8b-instant for fast, low-cost tasks.
Uses llama-3.3-70b-versatile for deep analysis tasks.
Falls back gracefully if GROQ_API_KEY is not set.
"""

import json
import re
from app.config import Config

# Only import groq if key is available — prevents crash on missing key
_groq_client = None

def _get_client():
    global _groq_client
    if _groq_client is None:
        if not Config.GROQ_API_KEY:
            raise RuntimeError(
                "GROQ_API_KEY is not set. Add it to your .env file."
            )
        from groq import Groq
        _groq_client = Groq(api_key=Config.GROQ_API_KEY)
    return _groq_client


def _chat(messages: list, model: str = "llama-3.1-8b-instant", temperature: float = 0.3) -> str:
    """Send a chat completion request to Groq and return the response text."""
    client = _get_client()
    response = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=1024,
    )
    return response.choices[0].message.content.strip()


def _extract_json(text: str) -> dict | list:
    """Extract the first valid JSON object or array from a string."""
    # Try direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # Strip markdown code fences and retry
    cleaned = re.sub(r"```(?:json)?", "", text).strip().strip("`")
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass
    # Find first {...} or [...] block
    match = re.search(r"(\{.*\}|\[.*\])", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass
    return {}


# ─────────────────────────────────────────────────────────────
# 1. RESUME PARSER
# ─────────────────────────────────────────────────────────────

GROQ_RESUME_SYSTEM = """You are an expert technical recruiter and career coach.
Extract structured information from the provided resume text.
Return ONLY a valid JSON object (no markdown, no commentary) with these exact keys:
{
  "name": "full name or null",
  "email": "email or null",
  "phone": "phone or null",
  "current_title": "most recent job title",
  "total_experience_years": number or null,
  "skills": ["list", "of", "technical", "and", "soft", "skills"],
  "education": "highest degree + field or null",
  "summary": "2-sentence professional summary",
  "suggested_roles": ["3 job roles that best fit this candidate"],
  "suggested_track": "one of: React Full-Stack | Machine Learning & AI | Cloud DevOps | Data Engineering | General Engineering",
  "key_strengths": ["top 3 strengths"],
  "areas_to_improve": ["top 2 skill gaps based on current market demand"]
}"""

def parse_resume(resume_text: str) -> dict:
    """
    Parse raw resume text using Groq LLM.
    Returns structured profile with skills, suggested track, and improvement areas.
    Falls back to regex-based extraction if Groq is unavailable.
    """
    if not Config.GROQ_API_KEY:
        return _fallback_resume_parse(resume_text)

    try:
        response = _chat(
            messages=[
                {"role": "system", "content": GROQ_RESUME_SYSTEM},
                {"role": "user", "content": f"Parse this resume:\n\n{resume_text[:4000]}"},
            ],
            model="llama-3.1-8b-instant",
            temperature=0.1,
        )
        parsed = _extract_json(response)
        if not isinstance(parsed, dict) or "skills" not in parsed:
            return _fallback_resume_parse(resume_text)
        return parsed
    except Exception as e:
        print(f"[GROQ] Resume parse failed: {e}. Using fallback.")
        return _fallback_resume_parse(resume_text)


def _fallback_resume_parse(resume_text: str) -> dict:
    """Regex-based fallback when Groq is unavailable."""
    from app.database.data_ingestion import SKILL_ALIASES

    text_lower = resume_text.lower()
    matched_skills = []

    all_skills = list(set(SKILL_ALIASES.values()))
    for skill in all_skills:
        if skill.lower() in text_lower:
            matched_skills.append(skill)

    # Determine track
    react_count = sum(1 for k in ['react', 'next.js', 'typescript', 'javascript', 'vue'] if k in text_lower)
    ml_count    = sum(1 for k in ['python', 'pytorch', 'tensorflow', 'machine learning', 'nlp', 'deep learning'] if k in text_lower)
    cloud_count = sum(1 for k in ['aws', 'kubernetes', 'docker', 'devops', 'terraform', 'gcp', 'azure'] if k in text_lower)
    data_count  = sum(1 for k in ['sql', 'spark', 'etl', 'postgresql', 'data engineering', 'airflow'] if k in text_lower)

    counts = {
        'React Full-Stack': react_count,
        'Machine Learning & AI': ml_count,
        'Cloud DevOps': cloud_count,
        'Data Engineering': data_count,
    }
    suggested_track = max(counts, key=counts.get) if any(counts.values()) else 'General Engineering'

    return {
        "name": None,
        "email": None,
        "skills": matched_skills[:15],
        "current_title": None,
        "total_experience_years": None,
        "education": None,
        "summary": "Profile parsed from resume text.",
        "suggested_roles": [],
        "suggested_track": suggested_track,
        "key_strengths": matched_skills[:3],
        "areas_to_improve": [],
    }


# ─────────────────────────────────────────────────────────────
# 2. MATCH SCORE EXPLANATION
# ─────────────────────────────────────────────────────────────

def explain_match(candidate: dict, job: dict, match_score: int) -> str:
    """
    Generate a 2-3 sentence plain-English explanation of why a candidate
    matches (or doesn't match) a specific job posting.
    """
    if not Config.GROQ_API_KEY:
        return _fallback_match_explanation(candidate, job, match_score)

    candidate_skills = [s['name'] for s in candidate.get('skills', [])]
    job_skills       = job.get('skills', [])
    overlap          = [s for s in candidate_skills if s in job_skills]
    missing          = [s for s in job_skills if s not in candidate_skills]

    prompt = (
        f"Candidate: {candidate.get('name')}, {candidate.get('title')}, "
        f"readiness {candidate.get('readiness_score')}%.\n"
        f"Job: {job.get('title')} at {job.get('company')} in {job.get('location')}.\n"
        f"Match score: {match_score}%.\n"
        f"Matching skills: {', '.join(overlap[:6]) or 'none'}.\n"
        f"Missing skills: {', '.join(missing[:4]) or 'none'}.\n"
        f"Write a 2-sentence explanation for the candidate about this match. "
        f"Be specific, encouraging, and actionable. No bullet points."
    )

    try:
        return _chat(
            messages=[
                {"role": "system", "content": "You are a helpful career advisor on a talent platform."},
                {"role": "user", "content": prompt},
            ],
            model="llama-3.1-8b-instant",
            temperature=0.4,
        )
    except Exception as e:
        print(f"[GROQ] Match explanation failed: {e}")
        return _fallback_match_explanation(candidate, job, match_score)


def _fallback_match_explanation(candidate: dict, job: dict, match_score: int) -> str:
    candidate_skills = {s['name'] for s in candidate.get('skills', [])}
    job_skills       = job.get('skills', [])
    overlap          = [s for s in job_skills if s in candidate_skills]
    missing          = [s for s in job_skills if s not in candidate_skills]

    text = f"Your profile matches {match_score}% of the requirements for {job.get('title')} at {job.get('company')}."
    if overlap:
        text += f" You have strong alignment in {', '.join(overlap[:3])}."
    if missing:
        text += f" Consider upskilling in {', '.join(missing[:2])} to strengthen your profile."
    return text


# ─────────────────────────────────────────────────────────────
# 3. CAREER PATH RECOMMENDATION
# ─────────────────────────────────────────────────────────────

def recommend_career_path(candidate: dict) -> dict:
    """
    Generate a personalised career path recommendation for a candidate
    based on their current skills, title, and readiness score.
    Returns a structured dict with next_role, timeline, and steps.
    """
    if not Config.GROQ_API_KEY:
        return _fallback_career_path(candidate)

    skills  = [s['name'] for s in candidate.get('skills', [])]
    title   = candidate.get('title', 'Engineer')
    cohort  = candidate.get('training', {}).get('track', 'General Engineering')
    score   = candidate.get('readiness_score', 75)

    system_msg = """You are a senior career coach specializing in the Indian tech job market.
Return ONLY a valid JSON object with these exact keys:
{
  "current_level": "Junior/Mid/Senior/Lead",
  "next_role": "suggested next job title",
  "timeline_months": number,
  "salary_range_inr": "e.g. 8-12 LPA",
  "steps": ["3-5 concrete action items to reach the next role"],
  "skills_to_add": ["2-3 most in-demand skills to add now"],
  "market_insight": "1 sentence about current demand for this career path in India"
}"""

    user_msg = (
        f"Current title: {title}\n"
        f"Skills: {', '.join(skills[:10])}\n"
        f"Training track: {cohort}\n"
        f"Readiness score: {score}%\n"
        "What is the best career path for this professional?"
    )

    try:
        response = _chat(
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_msg},
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.3,
        )
        result = _extract_json(response)
        if isinstance(result, dict) and "next_role" in result:
            return result
    except Exception as e:
        print(f"[GROQ] Career path failed: {e}")

    return _fallback_career_path(candidate)


def _fallback_career_path(candidate: dict) -> dict:
    title = candidate.get('title', 'Engineer')
    return {
        "current_level": "Mid",
        "next_role": f"Senior {title}",
        "timeline_months": 12,
        "salary_range_inr": "8-15 LPA",
        "steps": [
            "Complete your current training cohort",
            "Pass 2 skill assessments to earn verified badges",
            "Apply for 3 relevant job postings in your track",
            "Build a portfolio project demonstrating your primary skill"
        ],
        "skills_to_add": ["Docker", "System Design", "Communication"],
        "market_insight": "Demand for tech professionals continues to grow across India's major metros.",
    }


# ─────────────────────────────────────────────────────────────
# 4. SKILL DEMAND ANALYSIS
# ─────────────────────────────────────────────────────────────

def analyze_skill_demand(top_skills: list[dict]) -> str:
    """
    Given a list of top skills with counts from the job_postings collection,
    return a 2-3 sentence market insight about current demand trends.

    top_skills: [{"skill": "Python", "count": 579}, ...]
    """
    if not Config.GROQ_API_KEY:
        if top_skills:
            top = top_skills[0].get('skill', 'tech skills')
            return (f"{top} leads demand across the Indian job market. "
                    f"Upskilling in these areas significantly improves hiring probability.")
        return "Tech skill demand is strong across the Indian job market."

    skill_summary = ", ".join(
        f"{s['skill']} ({s['count']} jobs)" for s in top_skills[:8]
    )

    prompt = (
        f"Based on these most in-demand skills from current Indian job postings: {skill_summary}. "
        f"Write 2 concise sentences about the current demand landscape and what professionals should prioritize. "
        f"Be specific to the Indian market. No bullet points."
    )

    try:
        return _chat(
            messages=[
                {"role": "system", "content": "You are a data-driven talent market analyst focused on the Indian tech industry."},
                {"role": "user", "content": prompt},
            ],
            model="llama-3.1-8b-instant",
            temperature=0.3,
        )
    except Exception as e:
        print(f"[GROQ] Skill demand analysis failed: {e}")
        return "Strong demand for technical skills continues across major Indian job markets."


# ─────────────────────────────────────────────────────────────
# 5. READINESS SCORE NARRATIVE
# ─────────────────────────────────────────────────────────────

def generate_readiness_narrative(candidate: dict) -> str:
    """
    Generate a short, motivating narrative explaining a candidate's
    readiness score and what they can do to improve it.
    """
    if not Config.GROQ_API_KEY:
        score = candidate.get('readiness_score', 75)
        if score >= 90:
            return f"Outstanding! Your readiness score of {score} puts you in the top tier of available talent. You are ready for immediate deployment."
        elif score >= 75:
            return f"Your readiness score of {score} is strong. Complete your remaining skill assessments to push into the top tier."
        else:
            return f"Your readiness score of {score} shows good foundation. Focus on your training cohort and skill assessments to level up."

    score   = candidate.get('readiness_score', 75)
    skills  = [s['name'] for s in candidate.get('skills', []) if s.get('verified')]
    track   = candidate.get('training', {}).get('track', 'General')
    status  = candidate.get('status', 'Bench')

    prompt = (
        f"Candidate readiness score: {score}/100.\n"
        f"Verified skills: {', '.join(skills[:6]) or 'none yet'}.\n"
        f"Training track: {track}. Current status: {status}.\n"
        f"Write 2 sentences: first explain what the score means, "
        f"then give one specific actionable tip to improve it. "
        f"Keep it encouraging and professional. No bullet points."
    )

    try:
        return _chat(
            messages=[
                {"role": "system", "content": "You are a supportive career development coach on a workforce platform."},
                {"role": "user", "content": prompt},
            ],
            model="llama-3.1-8b-instant",
            temperature=0.4,
        )
    except Exception as e:
        print(f"[GROQ] Readiness narrative failed: {e}")
        score = candidate.get('readiness_score', 75)
        return f"Your readiness score is {score}. Keep completing assessments to improve your standing."
