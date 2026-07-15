from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import re

def clean_text(text):
    if not text:
        return ""
    text = str(text).lower()
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    return text.strip()

def compute_match_scores(query_text, documents):
    """
    Computes cosine similarity between a single query string and a list of document strings.
    Returns a list of scores (float between 0 and 1) corresponding to the documents.
    """
    if not documents or not query_text:
        return [0.0] * len(documents)

    cleaned_query = clean_text(query_text)
    cleaned_docs = [clean_text(doc) for doc in documents]
    
    # Check if there is anything to match after cleaning
    if not cleaned_query.strip():
        return [0.0] * len(documents)

    vectorizer = TfidfVectorizer(stop_words='english')
    try:
        tfidf_matrix = vectorizer.fit_transform([cleaned_query] + cleaned_docs)
    except ValueError:
        # E.g., if everything is stop words or empty
        return [0.0] * len(documents)

    cosine_similarities = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:]).flatten()
    return cosine_similarities.tolist()

def generate_candidate_text(candidate):
    """
    Converts a candidate dict into a single string for matching.
    """
    parts = []
    
    # Target role is most important
    if candidate.get("target_role"):
        parts.extend([candidate["target_role"]] * 2) # Weight heavily
    
    # Add skills
    skills = candidate.get("skills", [])
    if isinstance(skills, list):
        skill_names = [s.get("name", "") if isinstance(s, dict) else str(s) for s in skills]
        parts.extend(skill_names)
        
    # Add training/track
    training = candidate.get("training", {})
    if isinstance(training, dict) and training.get("track"):
        parts.append(training["track"])

    # Add experience context if available
    experience = candidate.get("experience", "")
    if experience:
        parts.append(str(experience))
        
    # Add education
    education = candidate.get("education", {})
    if isinstance(education, dict):
        if education.get("degree"): parts.append(education["degree"])
        if education.get("major"): parts.append(education["major"])
        
    # Add summary
    summary = candidate.get("summary", "")
    if summary:
        parts.append(str(summary))

    return " ".join(parts)

def generate_requirement_text(req):
    """
    Converts a requirement/job dict into a single string for matching.
    """
    parts = []
    
    # Role is most important
    if req.get("role"):
        parts.extend([req["role"]] * 2) # Weight heavily
    elif req.get("title"):
        parts.extend([req["title"]] * 2)
        
    # Add required skills
    skills = req.get("required_skills", req.get("skills_required", req.get("skills", [])))
    if isinstance(skills, list):
        skill_names = [s.get("name", "") if isinstance(s, dict) else str(s) for s in skills]
        parts.extend(skill_names)
    elif isinstance(skills, str):
        parts.append(skills)
        
    # Add experience required
    exp = req.get("experience", "")
    if exp:
        parts.append(str(exp))
        
    # Add full project description/JD
    desc = req.get("project_description", req.get("description", ""))
    if desc:
        parts.append(str(desc))
        
    return " ".join(parts)
