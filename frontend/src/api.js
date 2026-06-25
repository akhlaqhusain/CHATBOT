// src/api.js  —  Axios instance for all backend calls
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// ─── Request interceptor (log / attach token later if needed) ────────────────
api.interceptors.request.use(
  (config) => {
    // e.g. config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor (global error normalisation) ───────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error ||
      error.message ||
      'Something went wrong';
    console.error('[API Error]', message);
    return Promise.reject(new Error(message));
  }
);

// ─── Conversation endpoints ───────────────────────────────────────────────────

export const getConversations = () =>
  api.get('/api/conversations').then(r => r.data);

export const createConversation = () =>
  api.post('/api/conversations').then(r => r.data);

export const deleteConversation = (id) =>
  api.delete(`/api/conversations/${id}`).then(r => r.data);

export const renameConversation = (id, title) =>
  api.patch(`/api/conversations/${id}`, { title }).then(r => r.data);

// ─── Message endpoints ────────────────────────────────────────────────────────

export const getMessages = (conversationId) =>
  api.get(`/api/conversations/${conversationId}/messages`).then(r => r.data);

export const saveMessages = (conversationId, { userMessage, botMessage, title }) =>
  api.post(`/api/conversations/${conversationId}/messages`, {
    userMessage,
    botMessage,
    title,
  }).then(r => r.data);

export default api;
