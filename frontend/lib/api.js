import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  refreshToken: (refreshToken) => api.post('/auth/refresh-token', { refreshToken })
};

export const userAPI = {
  getProfile: () => api.get('/users/profile/me'),
  updateProfile: (data) => api.put('/users/profile/me', data),
  getUsers: (params) => api.get('/users', { params }),
  getUserById: (id) => api.get(`/users/${id}`)
};

export const subscriptionAPI = {
  create: (planId) => api.post('/subscriptions', { planId }),
  getAll: (params) => api.get('/subscriptions', { params }),
  getById: (id) => api.get(`/subscriptions/${id}`),
  cancel: (id, cancelAtPeriodEnd) => api.post(`/subscriptions/${id}/cancel`, { cancelAtPeriodEnd }),
  pause: (id) => api.post(`/subscriptions/${id}/pause`),
  resume: (id) => api.post(`/subscriptions/${id}/resume`)
};

export const orderAPI = {
  create: (data) => api.post('/orders', data),
  getAll: (params) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  updateStatus: (id, data) => api.put(`/orders/${id}/status`, data),
  getTracking: (id) => api.get(`/orders/${id}/tracking`)
};

export const messageAPI = {
  send: (data) => api.post('/messages', data),
  getAll: (params) => api.get('/messages', { params }),
  getRooms: () => api.get('/messages/rooms'),
  getRoomById: (id) => api.get(`/messages/rooms/${id}`),
  assignRoom: (id, assignedTo) => api.put(`/messages/rooms/${id}/assign`, { assignedTo }),
  closeRoom: (id) => api.put(`/messages/rooms/${id}/close`)
};

export const notificationAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all')
};

export const onboardingAPI = {
  getStatus: () => api.get('/onboarding/status'),
  completeStep: (stepName, data) => api.put(`/onboarding/steps/${stepName}`, { data }),
  skipStep: (stepName) => api.post(`/onboarding/skip/${stepName}`),
  reset: () => api.post('/onboarding/reset')
};

export const analyticsAPI = {
  getDashboard: (params) => api.get('/analytics/dashboard', { params }),
  getRevenue: (params) => api.get('/analytics/revenue', { params }),
  getCustomers: (params) => api.get('/analytics/customers', { params }),
  getActivity: (params) => api.get('/analytics/activity', { params })
};

export default api;