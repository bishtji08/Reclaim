const getApiBaseUrl = (): string => {
  const envUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();

  // 1. If an explicit environment override is provided, use it
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }

  // 2. In browser environments, inspect the current hostname
  if (typeof window !== 'undefined' && window.location) {
    const { hostname, protocol } = window.location;

    // Check if running on local development machine
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';

    // Check if running on a local private network IP (e.g. testing from a mobile phone on local Wi-Fi)
    const isPrivateLanIp =
      /^192\.168\.\d+\.\d+$/.test(hostname) ||
      /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(hostname);

    if (isLocalhost || isPrivateLanIp) {
      return `${protocol}//${hostname}:5000/api`;
    }

    // In production (Vercel, custom domains, *.vercel.app), ALWAYS use relative '/api'
    // This routes through Vercel's rewrite rules to the serverless backend without cross-origin or port issues.
    return '/api';
  }

  // 3. Fallback for SSR / build time
  return import.meta.env.PROD ? '/api' : 'http://localhost:5000/api';
};

export const API_BASE_URL = getApiBaseUrl();

export const api = {
  baseURL: API_BASE_URL,

  // Auth endpoints
  auth: {
    login: `${API_BASE_URL}/auth/login`,
    register: `${API_BASE_URL}/auth/register`,
    resendConfirmation: `${API_BASE_URL}/auth/resend-confirmation`,
    verifyEmail: `${API_BASE_URL}/auth/verify-email`,
    forgotPassword: `${API_BASE_URL}/auth/forgot-password`,
    resetPassword: `${API_BASE_URL}/auth/reset-password`,
    profile: `${API_BASE_URL}/auth/profile`,
    changePassword: `${API_BASE_URL}/auth/change-password`,
    logout: `${API_BASE_URL}/auth/logout`,
  },

  notifications: {
    list: `${API_BASE_URL}/notifications`,
    markRead: (id: string) => `${API_BASE_URL}/notifications/${id}/read`,
    markAllRead: `${API_BASE_URL}/notifications/mark-all-read`,
  },

  // Items endpoints
  items: {
    list: `${API_BASE_URL}/items`,
    create: `${API_BASE_URL}/items`,
    get: (id: string) => `${API_BASE_URL}/items/${id}`,
    update: (id: string) => `${API_BASE_URL}/items/${id}`,
    delete: (id: string) => `${API_BASE_URL}/items/${id}`,
    matches: (id: string) => `${API_BASE_URL}/items/${id}/matches`,
    updateStatus: (id: string) => `${API_BASE_URL}/items/${id}/status`,
  },

  // Claims endpoints
  claims: {
    list: `${API_BASE_URL}/claims`,
    create: `${API_BASE_URL}/claims`,
    get: (id: string) => `${API_BASE_URL}/claims/${id}`,
    review: (id: string) => `${API_BASE_URL}/claims/${id}/review`,
    withdraw: (id: string) => `${API_BASE_URL}/claims/${id}/withdraw`,
    myClaims: `${API_BASE_URL}/claims/my-claims`,
  },

  // Categories endpoints
  categories: {
    list: `${API_BASE_URL}/categories`,
    create: `${API_BASE_URL}/categories`,
    update: (id: string | number) => `${API_BASE_URL}/categories/${id}`,
    delete: (id: string | number) => `${API_BASE_URL}/categories/${id}`,
    subcategories: (id: string | number) => `${API_BASE_URL}/categories/${id}/subcategories`,
  },

  // Locations endpoints
  locations: {
    list: `${API_BASE_URL}/locations`,
  },

  // Analytics endpoints
  analytics: {
    dashboard: `${API_BASE_URL}/analytics/dashboard`,
    reports: `${API_BASE_URL}/analytics/reports`,
    visitors: `${API_BASE_URL}/analytics/visitors`,
    visitorSession: `${API_BASE_URL}/analytics/visitor/session`,
    visitorHeartbeat: `${API_BASE_URL}/analytics/visitor/heartbeat`,
    visitorPageview: `${API_BASE_URL}/analytics/visitor/pageview`,
    visitorAuth: `${API_BASE_URL}/analytics/visitor/auth`,
  },

  // Flags endpoints
  flags: {
    list: `${API_BASE_URL}/flags`,
    review: (id: string | number) => `${API_BASE_URL}/flags/${id}`,
  },

  // Reviews & Feedback endpoints
  reviews: {
    recent: `${API_BASE_URL}/reviews/recent`,
    byItem: (itemId: string | number) => `${API_BASE_URL}/reviews/item/${itemId}`,
    submit: `${API_BASE_URL}/reviews`,
  },

  // Users management (admin)
  users: {
    list: `${API_BASE_URL}/users`,
    get: (id: string) => `${API_BASE_URL}/users/${id}`,
    update: (id: string) => `${API_BASE_URL}/users/${id}`,
    blacklist: (id: string) => `${API_BASE_URL}/users/${id}/blacklist`,
    unblacklist: (id: string) => `${API_BASE_URL}/users/${id}/unblacklist`,
    activate: (id: string) => `${API_BASE_URL}/users/${id}/activate`,
    deactivate: (id: string) => `${API_BASE_URL}/users/${id}/deactivate`,
  },
};

export default api;
