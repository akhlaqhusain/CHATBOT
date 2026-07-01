// src/api.js — Axios instance for all backend calls
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use(
  config => config,
  error  => Promise.reject(error)
);

api.interceptors.response.use(
  response => response,
  error => {
    const message = error.response?.data?.error || error.message || 'Something went wrong';
    console.error('[API Error]', message);
    return Promise.reject(new Error(message));
  }
);

// ─── Conversations ────────────────────────────────────────────────────────────

export const getConversations  = ()         => api.get('/api/conversations').then(r => r.data);
export const createConversation = ()        => api.post('/api/conversations').then(r => r.data);
export const deleteConversation = (id)      => api.delete(`/api/conversations/${id}`).then(r => r.data);
export const renameConversation = (id, title) =>
  api.patch(`/api/conversations/${id}`, { title }).then(r => r.data);

// ─── Messages ─────────────────────────────────────────────────────────────────

export const getMessages = (conversationId) =>
  api.get(`/api/conversations/${conversationId}/messages`).then(r => r.data);

// Plain text message pair (no file)
export const saveMessages = (conversationId, { userMessage, botMessage, title }) =>
  api.post(`/api/conversations/${conversationId}/messages`, {
    userMessage, botMessage, title,
  }).then(r => r.data);

// Message pair WITH a file attachment — uses multipart/form-data
export const saveMessagesWithFile = (conversationId, { file, userMessage, botMessage, title }) => {
  const form = new FormData();
  form.append('file', file);                        // actual File object
  form.append('userMessage', userMessage || '');
  form.append('botMessage',  botMessage  || '');
  if (title) form.append('title', title);

  return api.post(
    `/api/conversations/${conversationId}/messages/upload`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  ).then(r => r.data);
};

export default api;
