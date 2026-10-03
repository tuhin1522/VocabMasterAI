import axios from 'axios';
import { useAuthStore } from '../store/authStore';

// In the built Tauri desktop app there is no Vite dev proxy, so we must
// use the full absolute URL.  In browser dev mode the relative path still
// works via Vite's proxy.
const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
const BASE_URL = isTauri ? 'http://localhost:3001/api' : '/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 - auto logout
api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth
export const authAPI = {
  login: (name: string, username: string) =>
    api.post('/auth/login', { name, username }),
};

// User
export const userAPI = {
  getProfile: () => api.get('/user/profile'),
  updateSettings: (data: { name?: string; dailyWordTarget?: number; preferredLanguage?: string }) =>
    api.put('/user/settings', data),
  getStreak: () => api.get('/user/streak'),
};

// Dashboard
export const dashboardAPI = {
  get: () => api.get('/dashboard'),
};

// Learning
export const learningAPI = {
  getTodayWords: () => api.get('/learning/today'),
  submitWord: (wordId: string, hintUsed: boolean) =>
    api.post('/learning/submit', { wordId, sessionId: '', hintUsed }),
  evaluateSentence: (wordId: string, sentence: string) =>
    api.post('/learning/sentence/evaluate', { wordId, sentence }),
  evaluateMeaning: (wordId: string, userMeaning: string) =>
    api.post('/learning/meaning/evaluate', { wordId, userMeaning }),
};

// Revision
export const revisionAPI = {
  getToday: () => api.get('/revision/today'),
  submitAnswer: (data: {
    wordId: string;
    questionType: string;
    userAnswer: string;
    isCorrect: boolean;
    score: number;
    hintUsed: boolean;
  }) => api.post('/revision/submit', data),
  getStatus: () => api.get('/revision/status'),
};

// Words
export const wordsAPI = {
  getAll: (params?: { search?: string; category?: string; difficulty?: string; status?: string; page?: number; limit?: number }) =>
    api.get('/words', { params }),
  getById: (id: string) => api.get(`/words/${id}`),
  searchByWord: (word: string) => api.get(`/words/search/${encodeURIComponent(word)}`),
  create: (data: object) => api.post('/words', data),
  update: (id: string, data: object) => api.put(`/words/${id}`, data),
  generate: (word: string) => api.post('/words/generate', { word }),
  saveGenerated: (data: object) => api.post('/words/generate/save', data),
  getNotebook: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get('/words/notebook/mine', { params }),
  getWeak: () => api.get('/words/weak/list'),
};

// Analytics
export const analyticsAPI = {
  get: () => api.get('/analytics'),
};

// Favorites
export const favoritesAPI = {
  getAll: () => api.get('/favorites'),
  add: (wordId: string) => api.post('/favorites', { wordId }),
  remove: (wordId: string) => api.delete(`/favorites/${wordId}`),
};

// Challenge
export const challengeAPI = {
  start: (type: string, count: number) => api.post('/challenge/start', { type, count }),
  complete: (results: object[], timeTaken: number) =>
    api.post('/challenge/complete', { results, timeTaken }),
};

// Admin
export const adminAPI = {
  getUsers: () => api.get('/admin/users'),
  getWords: () => api.get('/admin/words'),
  updateWord: (id: string, data: object) => api.put(`/admin/words/${id}`, data),
  deleteWord: (id: string) => api.delete(`/admin/words/${id}`),
  regenerateWord: (id: string) => api.post(`/admin/words/${id}/regenerate`),
  importWords: (words: object[]) => api.post('/admin/words/import', { words }),
  getStats: () => api.get('/admin/stats'),
};
