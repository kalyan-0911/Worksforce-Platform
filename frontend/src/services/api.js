const API_BASE_URL = 'http://localhost:5000/api';

export const fetchApi = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Retrieve token from storage
  const token = localStorage.getItem('workforcex_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Inject token if authenticated
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

export const api = {
  // Authentication Gateway APIs
  login: (credentials) => fetchApi('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  }),
  register: (userData) => fetchApi('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData)
  }),

  // Talent Inventory
  getProfessionals: () => fetchApi('/professionals'),
  toggleAvailability: (id, status) => fetchApi(`/professionals/${id}/availability`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  }),

  // Requisitions
  getRequisitions: () => fetchApi('/requisitions'),
  createRequisition: (reqData) => fetchApi('/requisitions', {
    method: 'POST',
    body: JSON.stringify(reqData)
  }),
  getRequisitionMatches: (id) => fetchApi(`/requisitions/${id}/matches`),

  // Teams / Projects
  getProjects: () => fetchApi('/projects'),
  deployTeam: (teamData) => fetchApi('/projects', {
    method: 'POST',
    body: JSON.stringify(teamData)
  }),

  // Analytics
  getAnalytics: () => fetchApi('/analytics'),

  // Assessments
  getAssessments: () => fetchApi('/assessments'),
  getAssessmentById: (id) => fetchApi(`/assessments/${id}`),
  submitAssessment: (id, submission) => fetchApi(`/assessments/${id}/submit`, {
    method: 'POST',
    body: JSON.stringify(submission)
  })
};
