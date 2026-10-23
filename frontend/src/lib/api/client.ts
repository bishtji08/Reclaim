import axios from 'axios';
import api from './config';
import { Item, Claim, User, Notification, VisitorAnalyticsData } from '../../types';

// Create axios instance with default config
export const apiClient = axios.create({
  baseURL: api.baseURL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    // The server sets an HttpOnly cookie. Let the browser build the multipart
    // boundary for uploads instead of forcing the default JSON header.
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    const isAuthRoute = url.includes('/auth/login') || url.includes('/auth/register');
    if (error.response?.status === 401 && !isAuthRoute) {
      window.dispatchEvent(new Event('auth:expired'));
    }
    return Promise.reject(error);
  }
);

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: unknown[];
  requiresVerification?: boolean;
  alreadyVerified?: boolean;
}

export interface PaginatedResponse<T> {
  items?: T[];
  claims?: T[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface AuthData {
  user: User;
}

export interface UserData {
  user: User;
}

export interface ItemData {
  item: Item;
}

export interface PotentialMatch {
  match_id: number;
  match_title: string;
  match_description: string;
  match_score?: number;
  match_reasons?: string[];
}

export interface MatchesData {
  matches: PotentialMatch[];
}

export interface ClaimData {
  claim: Claim;
}

export interface CategoriesData {
  categories: Array<{
    id: number | string;
    name: string;
    description?: string;
    icon?: string;
    subcategories?: Array<{ id: number | string; name: string; description?: string }>;
  }>;
}

export interface LocationsData {
  locations: Array<{
    id: number | string;
    name: string;
    description?: string;
    building?: string;
    floor?: string;
    room?: string;
    longitude?: number;
    latitude?: number;
  }>;
}

class ApiService {
  // Auth methods
  async login(email: string, password: string): Promise<ApiResponse<AuthData>> {
    const response = await apiClient.post(api.auth.login, { email, password });
    return response.data;
  }

  async register(userData: {
    email: string;
    password: string;
    name: string;
    phone?: string;
  }): Promise<ApiResponse<AuthData>> {
    const response = await apiClient.post(api.auth.register, userData);
    return response.data;
  }

  async resendConfirmation(email: string): Promise<ApiResponse<{ alreadyVerified?: boolean }>> {
    const response = await apiClient.post(api.auth.resendConfirmation, { email });
    return response.data;
  }

  async verifyEmail(token: string, email: string): Promise<ApiResponse<unknown>> {
    const response = await apiClient.post(api.auth.verifyEmail, { token, email });
    return response.data;
  }

  async forgotPassword(email: string): Promise<ApiResponse<unknown>> {
    const response = await apiClient.post(api.auth.forgotPassword, { email });
    return response.data;
  }

  async resetPassword(data: { token: string; email: string; newPassword: string }): Promise<ApiResponse<unknown>> {
    const response = await apiClient.post(api.auth.resetPassword, data);
    return response.data;
  }

  async getProfile(): Promise<ApiResponse<UserData>> {
    const response = await apiClient.get(api.auth.profile);
    return response.data;
  }

  async logout(): Promise<ApiResponse<unknown>> {
    const response = await apiClient.post(api.auth.logout);
    return response.data;
  }

  async updateProfile(userData: { name: string; phone?: string }): Promise<ApiResponse<UserData>> {
    const response = await apiClient.put(api.auth.profile, userData);
    return response.data;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<unknown>> {
    const response = await apiClient.put(api.auth.changePassword, { currentPassword, newPassword });
    return response.data;
  }

  // Items methods
  async getItems(params?: {
    q?: string;
    type?: string;
    category_id?: string;
    location_id?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<Item>>> {
    const response = await apiClient.get(api.items.list, { params });
    return response.data;
  }

  async getItem(id: string): Promise<ApiResponse<ItemData>> {
    const response = await apiClient.get(api.items.get(id));
    return response.data;
  }

  async createItem(itemData: FormData | Record<string, unknown>): Promise<ApiResponse<ItemData>> {
    const response = await apiClient.post(api.items.create, itemData);
    return response.data;
  }

  async updateItem(id: string, itemData: Partial<Item>): Promise<ApiResponse<ItemData>> {
    const response = await apiClient.put(api.items.update(id), itemData);
    return response.data;
  }

  async deleteItem(id: string): Promise<ApiResponse<unknown>> {
    const response = await apiClient.delete(api.items.delete(id));
    return response.data;
  }

  async getItemMatches(id: string): Promise<ApiResponse<MatchesData>> {
    const response = await apiClient.get(api.items.matches(id));
    return response.data;
  }

  async updateItemStatus(id: string, status: string, data?: Record<string, unknown>): Promise<ApiResponse<ItemData>> {
    const response = await apiClient.patch(api.items.updateStatus(id), { status, ...data });
    return response.data;
  }

  // Claims methods
  async getClaims(params?: {
    status?: string;
    item_id?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<Claim>>> {
    const response = await apiClient.get(api.claims.list, { params });
    return response.data;
  }

  async getMyClaims(): Promise<ApiResponse<{ claims: Claim[] }>> {
    const response = await apiClient.get(api.claims.myClaims);
    return response.data;
  }

  async getClaim(id: string): Promise<ApiResponse<ClaimData>> {
    const response = await apiClient.get(api.claims.get(id));
    return response.data;
  }

  async createClaim(claimData: FormData | Record<string, unknown>): Promise<ApiResponse<ClaimData>> {
    const response = await apiClient.post(api.claims.create, claimData);
    return response.data;
  }

  async reviewClaim(id: string, status: string, reviewNotes?: string): Promise<ApiResponse<ClaimData>> {
    const response = await apiClient.patch(api.claims.review(id), {
      status,
      review_notes: reviewNotes,
    });
    return response.data;
  }

  async withdrawClaim(id: string): Promise<ApiResponse<ClaimData>> {
    const response = await apiClient.patch(api.claims.withdraw(id));
    return response.data;
  }

  async getNotifications(params?: { page?: number; limit?: number; is_read?: boolean }): Promise<ApiResponse<{
    notifications: Notification[];
    unread_count: number;
  }>> {
    const response = await apiClient.get(api.notifications.list, { params });
    return response.data;
  }

  async markNotificationRead(id: string): Promise<ApiResponse<{ notification: Notification }>> {
    const response = await apiClient.patch(api.notifications.markRead(id));
    return response.data;
  }

  async markAllNotificationsRead(): Promise<ApiResponse<unknown>> {
    const response = await apiClient.patch(api.notifications.markAllRead);
    return response.data;
  }

  // Categories methods
  async getCategories(): Promise<ApiResponse<CategoriesData>> {
    const response = await apiClient.get(api.categories.list);
    return response.data;
  }

  async createCategory(data: { name: string; description?: string; icon?: string }): Promise<ApiResponse<{ category: Record<string, unknown> }>> {
    const response = await apiClient.post(api.categories.create, data);
    return response.data;
  }

  async updateCategory(id: string | number, data: { name?: string; description?: string; icon?: string }): Promise<ApiResponse<{ category: Record<string, unknown> }>> {
    const response = await apiClient.put(api.categories.update(id), data);
    return response.data;
  }

  async deleteCategory(id: string | number): Promise<ApiResponse<unknown>> {
    const response = await apiClient.delete(api.categories.delete(id));
    return response.data;
  }

  async getSubcategories(categoryId: string | number): Promise<ApiResponse<{ subcategories: Array<{ id: number | string; name: string; description?: string }> }>> {
    const response = await apiClient.get(api.categories.subcategories(categoryId));
    return response.data;
  }

  // Locations methods
  async getLocations(): Promise<ApiResponse<LocationsData>> {
    const response = await apiClient.get(api.locations.list);
    return response.data;
  }

  // Analytics methods
  async getDashboardAnalytics(): Promise<ApiResponse<Record<string, unknown>>> {
    const response = await apiClient.get(api.analytics.dashboard);
    return response.data;
  }

  async getReports(params?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> {
    const response = await apiClient.get(api.analytics.reports, { params });
    return response.data;
  }

  async getVisitorAnalytics(): Promise<ApiResponse<VisitorAnalyticsData>> {
    const response = await apiClient.get(api.analytics.visitors);
    return response.data;
  }

  async recordVisitorSession(data: { sessionId: string; landingPath?: string; visitorType?: string }): Promise<ApiResponse<{ sessionId: string; isNew: boolean }>> {
    const response = await apiClient.post(api.analytics.visitorSession, data);
    return response.data;
  }

  async recordVisitorHeartbeat(data: { sessionId: string; currentPath?: string }): Promise<ApiResponse<{ active: boolean; expired?: boolean }>> {
    const response = await apiClient.post(api.analytics.visitorHeartbeat, data);
    return response.data;
  }

  async recordVisitorPageview(data: { sessionId: string; path: string }): Promise<ApiResponse<unknown>> {
    const response = await apiClient.post(api.analytics.visitorPageview, data);
    return response.data;
  }

  async recordVisitorAuth(data: { sessionId: string }): Promise<ApiResponse<{ visitorType: string }>> {
    const response = await apiClient.post(api.analytics.visitorAuth, data);
    return response.data;
  }

  // Flags & Moderation methods
  async flagItem(itemId: string | number, reason: string): Promise<ApiResponse<unknown>> {
    const response = await apiClient.post(`${api.items.get(String(itemId))}/flag`, { reason });
    return response.data;
  }

  async getFlags(params?: { status?: string; page?: number; limit?: number }): Promise<ApiResponse<{
    flags: Array<Record<string, unknown>>;
    pagination: { current_page: number; total_pages: number; total_items: number; items_per_page: number };
  }>> {
    const response = await apiClient.get(api.flags.list, { params });
    return response.data;
  }

  async reviewFlag(id: string | number, data: { status: string; admin_notes?: string; clear_suspicion?: boolean }): Promise<ApiResponse<unknown>> {
    const response = await apiClient.patch(api.flags.review(id), data);
    return response.data;
  }

  // Reviews & Feedback methods
  async getRecentReviews(): Promise<ApiResponse<{
    reviews: Array<Record<string, unknown>>;
    stats: { total_reviews: number; average_rating: number; returned_count: number };
  }>> {
    const response = await apiClient.get(api.reviews.recent);
    return response.data;
  }

  async getItemReviews(itemId: string | number): Promise<ApiResponse<{ reviews: Array<Record<string, unknown>> }>> {
    const response = await apiClient.get(api.reviews.byItem(itemId));
    return response.data;
  }

  async submitReview(data: {
    item_id: string | number;
    claim_id?: string | number;
    rating: number;
    comment?: string;
    was_returned?: boolean;
  }): Promise<ApiResponse<unknown>> {
    const response = await apiClient.post(api.reviews.submit, data);
    return response.data;
  }

  // User management methods (Admin)
  async getUsers(params?: { page?: number; limit?: number; role?: string; is_active?: boolean }): Promise<ApiResponse<{
    users: User[];
    pagination: { current_page: number; total_pages: number; total_items: number; items_per_page: number };
  }>> {
    const response = await apiClient.get(api.users.list, { params });
    return response.data;
  }

  async blacklistUser(id: string, reason: string): Promise<ApiResponse<{ user: User }>> {
    const response = await apiClient.patch(api.users.blacklist(id), { reason });
    return response.data;
  }

  async unblacklistUser(id: string): Promise<ApiResponse<{ user: User }>> {
    const response = await apiClient.patch(api.users.unblacklist(id));
    return response.data;
  }

  async activateUser(id: string): Promise<ApiResponse<{ user: User }>> {
    const response = await apiClient.patch(api.users.activate(id));
    return response.data;
  }

  async deactivateUser(id: string): Promise<ApiResponse<{ user: User }>> {
    const response = await apiClient.patch(api.users.deactivate(id));
    return response.data;
  }

  async updateUserRole(id: string, role: 'admin' | 'finder' | 'user'): Promise<ApiResponse<{ user: User }>> {
    const response = await apiClient.put(api.users.update(id), { role });
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService;
