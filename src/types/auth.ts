export type UserRole = "admin" | "user";

export interface AuthUser {
  userId: number;
  role: UserRole;
  expires?: string;
}

export interface UserPublic {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  companyId?: number | null;
  profilePhoto?: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  companyName: string;
}

export interface AuthSession {
  userId: number;
  role: UserRole;
  expires: Date;
}