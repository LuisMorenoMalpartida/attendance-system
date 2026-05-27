export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiError {
  success?: false;
  error: string;
  field?: string;
  code?: string;
  details?: unknown;
}

export type ApiResponse<T = unknown> =
  | ApiSuccess<T>
  | ApiError;