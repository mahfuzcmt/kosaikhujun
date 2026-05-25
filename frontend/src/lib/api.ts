const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8082/api';

/**
 * Resolve a photo URL stored in the database to an absolute URL the browser can load.
 *
 * Photos are stored as relative paths (e.g. "/uploads/abc.jpg") so the same row works
 * across environments. Legacy rows may still hold absolute URLs (http://localhost:8082/...
 * or http://<old-ip>/...); for those we strip everything up to and including "/uploads/"
 * and re-anchor against the current API base. Falsy input returns empty so the caller's
 * conditional rendering still falls back to initials.
 */
export function resolveImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('/')) return `${API_BASE}${url}`;
  if (/^https?:\/\//i.test(url)) {
    const idx = url.indexOf('/uploads/');
    if (idx >= 0) return `${API_BASE}${url.substring(idx)}`;
    return url;
  }
  return `${API_BASE}/${url}`;
}

interface ApiResponse<T> {
  data?: T;
  error?: { code: string; message: string };
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('accessToken', token);
      } else {
        localStorage.removeItem('accessToken');
      }
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('accessToken');
    }
    return this.token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    // Handle empty responses
    const text = await response.text();
    if (!text) {
      if (!response.ok) {
        return { error: { code: 'ERROR', message: response.statusText || 'Request failed' } };
      }
      return { data: undefined };
    }

    try {
      const json = JSON.parse(text);
      if (!response.ok) {
        return { error: json.error || { code: 'ERROR', message: 'Something went wrong' } };
      }
      return json;
    } catch {
      return { error: { code: 'PARSE_ERROR', message: 'Invalid response from server' } };
    }
  }

  async get<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: 'GET' });
  }

  async post<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: 'DELETE' });
  }

  async uploadFile<T>(path: string, file: File): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const formData = new FormData();
    formData.append('file', file);

    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const text = await response.text();
    if (!text) {
      if (!response.ok) {
        return { error: { code: 'ERROR', message: response.statusText || 'Upload failed' } };
      }
      return { data: undefined };
    }

    try {
      const json = JSON.parse(text);
      if (!response.ok) {
        return { error: json.error || { code: 'ERROR', message: 'Upload failed' } };
      }
      return json;
    } catch {
      return { error: { code: 'PARSE_ERROR', message: 'Invalid response from server' } };
    }
  }
}

export const api = new ApiClient();

// Auth APIs
export const authApi = {
  // OTP-based auth (for password reset)
  sendOtp: (phone: string) => api.post<{ success: boolean; otp?: string; devMode?: boolean }>('/auth/send-otp', { phone }),
  verifyOtp: (phone: string, code: string) => api.post<AuthResponse>('/auth/verify-otp', { phone, code }),
  refresh: (refreshToken: string) => api.post<AuthResponse>('/auth/refresh', { refreshToken }),

  // Password-based auth
  login: (phone: string, password: string) => api.post<AuthResponse>('/auth/login', { phone, password }),
  register: (phone: string, password: string, name?: string) => api.post<AuthResponse>('/auth/register', { phone, password, name }),
  setPassword: (phone: string, password: string) => api.post<{ success: boolean }>('/auth/set-password', { phone, password }),
  resetPassword: (phone: string, otp: string, newPassword: string) => api.post<{ success: boolean }>('/auth/reset-password', { phone, otp, newPassword }),
  hasPassword: (phone: string) => api.get<{ hasPassword: boolean }>(`/auth/has-password?phone=${phone}`),
};

// Butcher APIs
export interface ButcherSearchResult {
  data: ButcherDto[];
  page: { total: number; page: number; limit: number };
}

export const butcherApi = {
  search: async (params: { districtId?: number; thanaId?: number; q?: string; page?: number; limit?: number }): Promise<{ data?: ButcherSearchResult; error?: { code: string; message: string } }> => {
    const query = new URLSearchParams();
    if (params.districtId) query.set('districtId', params.districtId.toString());
    if (params.thanaId) query.set('thanaId', params.thanaId.toString());
    if (params.q && params.q.trim()) query.set('q', params.q.trim());
    if (params.page !== undefined) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    // The API returns { data: [], page: {} } directly, we wrap it
    const response = await api.get<ButcherSearchResult>(`/butchers?${query}`);
    return response;
  },
  getById: (id: string) => api.get<ButcherDto>(`/butchers/${id}`),
  unlock: (id: string) => api.post<ButcherDto>(`/butchers/${id}/unlock`),
  addFavorite: (id: string) => api.post(`/butchers/${id}/favorite`),
  removeFavorite: (id: string) => api.delete(`/butchers/${id}/favorite`),
};

// Location APIs
function dedupeByName<T extends { districtId: number; nameEn: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = `${item.districtId}|${item.nameEn}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export const locationApi = {
  getDistricts: async () => {
    const res = await api.get<District[]>('/districts');
    if (res.data) {
      const seen = new Set<string>();
      res.data = res.data.filter((d) => (seen.has(d.nameEn) ? false : (seen.add(d.nameEn), true)));
    }
    return res;
  },
  getThanas: async (districtId?: number) => {
    const res = await api.get<Thana[]>(`/thanas${districtId ? `?districtId=${districtId}` : ''}`);
    if (res.data) res.data = dedupeByName(res.data);
    return res;
  },
};

// Package APIs
export const packageApi = {
  getAll: () => api.get<PackageDto[]>('/packages'),
  purchase: (packageId: number) => api.post<BkashPaymentInitResponse>('/subscriptions', { packageId }),
};

// Payment APIs
export const paymentApi = {
  callback: (paymentID: string, status: string) =>
    api.post<PaymentCallbackResponse>('/payment/callback', { paymentID, status }),
  getStatus: (paymentId: string) => api.get<PaymentStatusResponse>(`/payment/${paymentId}/status`),
};

// Customer APIs
export const customerApi = {
  getMe: () => api.get<{ user: UserDto; profile: unknown }>('/me'),
  getSubscription: () => api.get<SubscriptionDto>('/me/subscription'),
  getAllSubscriptions: () => api.get<SubscriptionDto[]>('/me/subscriptions'),
  getUnlocked: () => api.get<ButcherDto[]>('/me/unlocked'),
  getFavorites: () => api.get<ButcherDto[]>('/me/favorites'),
};

// Registration APIs
export const registerApi = {
  butcher: (data: ButcherRegisterRequest) => api.post<ButcherDto>('/register/butcher', data),
  customer: (data: CustomerRegisterRequest) => api.post<unknown>('/register/customer', data),
};

// Upload APIs
export const uploadApi = {
  photo: (file: File) => api.uploadFile<{ url: string }>('/uploads/photo', file),
};

// Types
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserDto;
  profile?: { type: string; profileId: string; status?: string };
  isNewUser: boolean;
}

export interface UserDto {
  id: string;
  phone: string;
  name: string;
  userType: 'BUTCHER' | 'CUSTOMER' | 'ADMIN';
  verified: boolean;
  createdAt: string;
}

export interface ButcherDto {
  id: string;
  name: string;
  photoUrl?: string;
  cowPrice?: number;
  cowPriceType: 'PER_ANIMAL' | 'PER_KG' | 'PERCENTAGE';
  goatPrice?: number;
  goatPriceType: 'PER_ANIMAL' | 'PER_KG' | 'PERCENTAGE';
  cowCapacity?: number;
  goatCapacity?: number;
  rating?: number;
  totalReviews?: number;
  status: string;
  thanas?: ThanaDto[];
  phone?: string;
  whatsapp?: string;
  contactUnlocked: boolean;
  unlockCount?: number;
  unlockLimit?: number;
}

export interface ThanaDto {
  id: number;
  nameBn: string;
  nameEn: string;
  districtId: number;
}

export interface District {
  id: number;
  nameBn: string;
  nameEn: string;
}

export interface Thana {
  id: number;
  districtId: number;
  nameBn: string;
  nameEn: string;
}

export interface PackageDto {
  id: number;
  name: string;
  nameBn: string;
  description?: string;
  descriptionBn?: string;
  contactLimit?: number;
  price: number;
  isActive: boolean;
}

export interface SubscriptionDto {
  id: string;
  pkg: PackageDto;
  contactsUsed: number;
  contactLimit?: number;
  contactsRemaining: number;
  status: string;
  purchasedAt: string;
  expiresAt?: string;
}

export interface ButcherRegisterRequest {
  name: string;
  whatsapp: string;
  thanaIds: number[];
  cowPrice?: number;
  cowPriceType?: string;
  goatPrice?: number;
  goatPriceType?: string;
  cowCapacity?: number;
  goatCapacity?: number;
  photoUrl?: string;
}

export interface CustomerRegisterRequest {
  name: string;
  whatsapp?: string;
  address?: string;
  districtId?: number;
  thanaIds?: number[];
}

export interface BkashPaymentInitResponse {
  paymentId: string;
  bkashPaymentId: string;
  bkashURL: string;
}

export interface PaymentCallbackResponse {
  status: 'SUCCESS' | 'FAILED';
  message: string;
  subscription?: SubscriptionDto;
  trxID?: string;
}

export interface PaymentStatusResponse {
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  transactionId?: string;
}
