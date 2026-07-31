export type AdminRole = string;

export interface AdminUser {
  id: number;
  email: string;
  fullName: string;
  role: AdminRole;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AdminUserRow {
  id: number;
  email: string;
  password_hash: string;
  full_name: string;
  role: AdminRole;
  is_active: number;
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | null;
}

export interface AuthTokenPayload {
  sub: number;
  email: string;
  name: string;
  role: AdminRole;
}

export interface SignupInput {
  email: string;
  password: string;
  fullName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: AdminUser;
}
