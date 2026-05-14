export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: Record<string, unknown>;
}

export function success<T>(data: T, meta?: Record<string, unknown>): ApiResponse<T> {
  return {
    success: true,
    data,
    ...(meta ? { meta } : {}),
  };
}

export function error(message: string, code?: string): ApiResponse<never> {
  return {
    success: false,
    error: message,
    ...(code ? { meta: { code } } : {}),
  };
}
