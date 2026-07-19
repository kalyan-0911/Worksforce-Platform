const API_BASE_URL = 'http://localhost:5000/api';

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

export const fetchApi = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  let token = localStorage.getItem('workforcex_token');
  let headers = { ...options.headers };
  
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }
  
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  let response = await fetch(url, { ...options, headers });
  
  if (response.status === 401 && localStorage.getItem('workforcex_refresh_token')) {
    if (isRefreshing) {
      return new Promise(function(resolve, reject) {
        failedQueue.push({ resolve, reject });
      }).then(newToken => {
        headers['Authorization'] = `Bearer ${newToken}`;
        return fetch(url, { ...options, headers });
      }).then(res => {
        if (!res.ok) throw new Error('Retry failed');
        return res.json();
      });
    }

    isRefreshing = true;
    try {
      const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: localStorage.getItem('workforcex_refresh_token') })
      });

      if (refreshRes.ok) {
        const data = await refreshRes.json();
        localStorage.setItem('workforcex_token', data.access_token);
        headers['Authorization'] = `Bearer ${data.access_token}`;
        processQueue(null, data.access_token);
        
        response = await fetch(url, { ...options, headers });
      } else {
        processQueue(new Error('Refresh failed'), null);
        localStorage.removeItem('workforcex_token');
        localStorage.removeItem('workforcex_refresh_token');
        localStorage.removeItem('workforcex_user');
        window.location.href = '/';
        throw new Error('Session expired');
      }
    } catch (err) {
      processQueue(err, null);
      throw err;
    } finally {
      isRefreshing = false;
    }
  }

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
  uploadResume: (formData) => fetchApi('/candidates/upload-resume', { method: 'POST', body: formData }),
  updateProfessional: (id, data) => fetchApi(`/professionals/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Resume
  parseResume: (resumeData) => fetchApi('/candidates/parse-resume', { method: 'POST', body: JSON.stringify(resumeData) }),
  getRecommendedJobs: (id, limit = 5) => fetchApi(`/candidates/${id}/recommended-jobs?limit=${limit}`),
  getCareerPath: (id) => fetchApi(`/candidates/${id}/career-path`),

  // Organizations
  getMyOrganization: () => fetchApi('/organizations/me'),
  getPublicOrganizations: () => fetchApi('/organizations/public'),
  getOrganizationById: (id) => fetchApi(`/organizations/public/${id}`),
  updateMyOrganization: (data) => fetchApi('/organizations/me', { method: 'POST', body: JSON.stringify(data) }),
  uploadEmployerRoster: (formData) => fetchApi('/organizations/upload', { method: 'POST', body: formData }),

  // Requisitions
  getRequisitions: () => fetchApi('/requisitions'),
  createRequisition: (reqData) => fetchApi('/requisitions', { method: 'POST', body: JSON.stringify(reqData) }),
  getRequisitionMatches: (id) => fetchApi(`/requisitions/${id}/matches`),
  deleteRequisition: (id) => fetchApi(`/requisitions/${id}`, { method: 'DELETE' }),

  // Projects / Teams
  getProjects: () => fetchApi('/projects'),
  deployTeam: (teamData) => fetchApi('/projects', { method: 'POST', body: JSON.stringify(teamData) }),
  recommendSquad: (rolesData) => fetchApi('/projects/recommend-squad', { method: 'POST', body: JSON.stringify(rolesData) }),
  deleteProject: (id) => fetchApi(`/projects/${id}`, { method: 'DELETE' }),

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
