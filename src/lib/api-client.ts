// Copyright (c) 2026 Interactor, Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Typed API client for the Build backend.
 *
 * Auth: all authenticated requests use `Authorization: Bearer pm_mobile_<token>`.
 * The token is minted by the backend (POST /api/v1/me/mobile-sessions) after
 * any sign-in method (email/password or Interactor SSO) and stored in SecureStore.
 */
import { API_BASE_URL } from "@/src/lib/config";
import { useAuthStore } from "@/src/store/auth";

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { mobileToken } = useAuthStore.getState();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };

  if (mobileToken) {
    headers["Authorization"] = `Bearer ${mobileToken}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
      details?: unknown;
    };
    throw new ApiError(
      body.error ?? "unknown_error",
      body.message ?? res.statusText,
      res.status,
      body.details
    );
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
