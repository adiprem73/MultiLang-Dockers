import { supabase } from "./supabase";

const BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
  "http://localhost:5000";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (!token) {
    throw new ApiError("Your session has expired. Please sign in again.", 401);
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: { ...(await authHeaders()), ...options.headers },
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      `Cannot reach the server at ${BASE_URL}. Is the backend running?`,
    );
  }

  if (!response.ok) {
    const body = await response.text();
    let message = body;

    try {
      message = JSON.parse(body).error ?? body;
    } catch {
      // Non-JSON error body — use it as-is.
    }

    throw new ApiError(
      message || `Request failed (${response.status})`,
      response.status,
    );
  }

  return response.status === 204 ? (undefined as T) : response.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),

  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),

  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
