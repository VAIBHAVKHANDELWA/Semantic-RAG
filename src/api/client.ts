import type { RbacRole, RbacTenant } from '../types';

export const API_BASE_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:8080/api/v1';
export const MINIO_BASE_URL = import.meta.env.VITE_MINIO_ENDPOINT || 'http://localhost:9000';
export const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

export interface AuthResponse {
  token: string;
  mustChangePassword?: boolean;
  user: {
    id: string;
    email: string;
    name: string;
    role: RbacRole;
    tenant: RbacTenant;
    isSuperAdmin?: boolean;
  };
}

export interface ChangePasswordResponse {
  message: string;
  token: string;
}

export interface AdminUserResponse {
  id: string;
  email: string;
  displayName: string;
  role: RbacRole;
  tenantId: string;
  active: boolean;
  mustChangePassword: boolean;
  failedLoginAttempts?: number;
  lockedUntil?: string | null;
  lastLoginAt?: string | null;
  createdBy?: string | null;
  isSuperAdmin?: boolean;
  createdAt?: string;
  temporaryPassword?: string;
}

export interface CreateUserRequest {
  email: string;
  displayName: string;
  role: string;
  tenantId: string;
}

export interface PatchUserRequest {
  role?: string;
  active?: boolean;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  
  // Attach token if provided or retrieve from sessionStorage
  const activeToken = token || (typeof window !== 'undefined' ? sessionStorage.getItem('auth_token') : null);
  if (activeToken) {
    headers.set('Authorization', `Bearer ${activeToken}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.error || errorData.message || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export async function loginApi(email: string, password: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function changePasswordApi(
  oldPassword: string,
  newPassword: string,
  token?: string | null
): Promise<ChangePasswordResponse> {
  return apiRequest<ChangePasswordResponse>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ oldPassword, newPassword }),
  }, token);
}

export async function logoutApi(token?: string | null): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/auth/logout', {
    method: 'POST',
  }, token);
}

// Admin User Management Endpoints
export async function adminListUsers(token?: string | null): Promise<AdminUserResponse[]> {
  return apiRequest<AdminUserResponse[]>('/admin/users', {
    method: 'GET',
  }, token);
}

export async function adminCreateUser(
  req: CreateUserRequest,
  token?: string | null
): Promise<AdminUserResponse> {
  return apiRequest<AdminUserResponse>('/admin/users', {
    method: 'POST',
    body: JSON.stringify(req),
  }, token);
}

export async function adminPatchUser(
  id: string,
  req: PatchUserRequest,
  token?: string | null
): Promise<AdminUserResponse> {
  return apiRequest<AdminUserResponse>(`/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(req),
  }, token);
}

export async function adminResetPassword(
  id: string,
  token?: string | null
): Promise<AdminUserResponse> {
  return apiRequest<AdminUserResponse>(`/admin/users/${id}/reset-password`, {
    method: 'POST',
  }, token);
}
