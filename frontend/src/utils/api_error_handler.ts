import { ApiError } from "./api_client";

export function getApiErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}