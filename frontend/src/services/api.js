const API_BASE_URL = 'http://localhost:5000/api';

export const fetchApi = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('workforcex_token');
  let headers = { ...options.headers };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

export const api = {
  // Auth
  login: (credentials) => fetchApi('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (userData) => fetchApi('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  getMe: () => fetchApi('/auth/me'),

  // Talent  // Candidates / Professionals
  getProfessionals: (search = '', role = '', skill = '', status = '', page = 1, limit = 50) =>
    fetchApi(`/professionals?search=${encodeURIComponent(search)}&role=${encodeURIComponent(role)}&skill=${encodeURIComponent(skill)}&status=${status}&page=${page}&limit=${limit}`),
  getProfessionalById: (id) => fetchApi(`/professionals/${id}`),
  getReverseMatches: () => fetchApi('/candidates/reverse-matches'),
  getCareerPath: (id) => fetchApi(`/candidates/${id}/career-path`),
  toggleAvailability: (id, status) => fetchApi(`/professionals/${id}/availability`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  uploadResume: async (formData) => {
    const token = localStorage.getItem('workforcex_token');
    const res = await fetch('http://localhost:5000/api/candidates/upload-resume', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to upload resume');
    }
    return res.json();
  },

  // Resume
  parseResume: (resumeData) => fetchApi('/candidates/parse-resume', { method: 'POST', body: JSON.stringify(resumeData) }),
  getRecommendedJobs: (id, limit = 5) => fetchApi(`/candidates/${id}/recommended-jobs?limit=${limit}`),
  getCareerPath: (id) => fetchApi(`/candidates/${id}/career-path`),

  // Organizations
  getMyOrganization: () => fetchApi('/organizations/me'),
  getPublicOrganizations: () => fetchApi('/organizations/public'),
  getOrganizationById: (id) => fetchApi(`/organizations/public/${id}`),

  // Requisitions
  getRequisitions: () => fetchApi('/requisitions'),
  createRequisition: (reqData) => fetchApi('/requisitions', { method: 'POST', body: JSON.stringify(reqData) }),
  getRequisitionMatches: (id) => fetchApi(`/requisitions/${id}/matches`),

  // Projects / Teams
  getProjects: () => fetchApi('/projects'),
  deployTeam: (teamData) => fetchApi('/projects', { method: 'POST', body: JSON.stringify(teamData) }),
  recommendSquad: (rolesData) => fetchApi('/projects/recommend-squad', { method: 'POST', body: JSON.stringify(rolesData) }),

  // Opportunities
  createOpportunity: (oppData) => fetchApi('/opportunities', { method: 'POST', body: JSON.stringify(oppData) }),
  getOpportunities: () => fetchApi('/opportunities'),
  getEmployerOpportunities: () => fetchApi('/opportunities/employer'),
  acceptOpportunity: (id) => fetchApi(`/opportunities/${id}/accept`, { method: 'POST' }),
  rejectOpportunity: (id) => fetchApi(`/opportunities/${id}/reject`, { method: 'POST' }),
  approveOpportunity: (id) => fetchApi(`/opportunities/${id}/approve`, { method: 'POST' }),
  requestOpportunity: (jobId) => fetchApi('/opportunities/request', { method: 'POST', body: JSON.stringify({ jobId }) }),

  // Job Postings / Marketplace
  getJobPostings: (page = 1, perPage = 20, skill = '', location = '', title = '') =>
    fetchApi(`/job-postings?page=${page}&per_page=${perPage}&skill=${encodeURIComponent(skill)}&location=${encodeURIComponent(location)}&title=${encodeURIComponent(title)}`),
  getJobById: (id) => fetchApi(`/job-postings/${id}`),
  getMarketInsights: () => fetchApi('/job-postings/market-insights'),

  // Analytics
  getAnalytics: () => fetchApi('/analytics'),

  // Assessments
  getAssessments: () => fetchApi('/assessments'),
  getAssessmentById: (id) => fetchApi(`/assessments/${id}`),
  submitAssessment: (id, submission) =>
    fetchApi(`/assessments/${id}/submit`, { method: 'POST', body: JSON.stringify(submission) }),
};
