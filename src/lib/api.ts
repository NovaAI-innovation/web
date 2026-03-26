export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "DEPENDENCY_FAILURE"
  | "INTERNAL_ERROR"
  | "EMAIL_NOT_VERIFIED"
  | "ACCOUNT_LOCKED"
  | "TWO_FACTOR_REQUIRED";

export type ApiSuccess<T> = {
  data: T;
  error: null;
};

export type ApiError = {
  data: null;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
};

export function success<T>(data: T): ApiSuccess<T> {
  return { data, error: null };
}

export function failure(
  code: ApiErrorCode,
  message: string,
  details?: unknown,
): ApiError {
  return {
    data: null,
    error: { code, message, details },
  };
}
