
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T | null;
  detail?: string | { msg?: string }[];
}

class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(
    message: string,
    status: number,
    data: unknown = null
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      if (!API_BASE_URL) {
        throw new Error(
          "NEXT_PUBLIC_API_URL is not configured."
        );
      }

      const response = await fetch(
        `${API_BASE_URL}/api/auth/refresh`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        accessToken = null;
        return null;
      }

      const body: ApiResponse<{
        access_token: string;
        token_type: string;
        user: unknown;
      }> = await response.json();

      if (!body.success || !body.data?.access_token) {
        accessToken = null;
        return null;
      }

      accessToken = body.data.access_token;

      return accessToken;
    } catch {
      accessToken = null;
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function getErrorMessage<T>(
  body: ApiResponse<T> | null
): string {
  if (body?.message) {
    return body.message;
  }

  const detail = body?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return (
      detail
        .map((item) => item.msg)
        .filter(
          (message): message is string => Boolean(message)
        )
        .join(", ") || "Something went wrong."
    );
  }

  return "Something went wrong.";
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  allowRefresh = true
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error(
      "NEXT_PUBLIC_API_URL is not configured."
    );
  }

  const headers = new Headers(options.headers);

  const isFormData =
    typeof FormData !== "undefined" &&
    options.body instanceof FormData;

  if (
    options.body !== undefined &&
    !headers.has("Content-Type") &&
    !isFormData
  ) {
    headers.set("Content-Type", "application/json");
  }

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      ...options,
      headers,
      credentials: "include",
    }
  );

  let body: ApiResponse<T> | null = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  const isAuthEndpoint =
    endpoint === "/api/auth/refresh" ||
    endpoint === "/api/auth/login" ||
    endpoint === "/api/auth/signup";

  if (
    response.status === 401 &&
    allowRefresh &&
    !isAuthEndpoint
  ) {
    const newToken = await refreshAccessToken();

    if (newToken) {
      return request<T>(endpoint, options, false);
    }
  }

  if (!response.ok || !body?.success) {
    throw new ApiError(
      getErrorMessage(body),
      response.status,
      body?.data ?? null
    );
  }

  return body.data as T;
}

export const apiClient = {
  get: <T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> =>
    request<T>(endpoint, {
      ...options,
      method: "GET",
    }),

  post: <T>(
    endpoint: string,
    data?: unknown,
    options?: RequestInit
  ): Promise<T> =>
    request<T>(endpoint, {
      ...options,
      method: "POST",
      body:
        data !== undefined
          ? JSON.stringify(data)
          : undefined,
    }),

  put: <T>(
    endpoint: string,
    data?: unknown,
    options?: RequestInit
  ): Promise<T> =>
    request<T>(endpoint, {
      ...options,
      method: "PUT",
      body:
        data !== undefined
          ? JSON.stringify(data)
          : undefined,
    }),

  patch: <T>(
    endpoint: string,
    data?: unknown,
    options?: RequestInit
  ): Promise<T> =>
    request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body:
        data !== undefined
          ? JSON.stringify(data)
          : undefined,
    }),

  upload: <T>(
    endpoint: string,
    formData: FormData
  ): Promise<T> =>
    request<T>(endpoint, {
      method: "POST",
      body: formData,
    }),

  delete: <T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> =>
    request<T>(endpoint, {
      ...options,
      method: "DELETE",
    }),
};

export { ApiError };