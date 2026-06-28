// Copyright (c) 2026 Interactor, Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Auth store for the Build mobile companion app.
 *
 * All sign-in methods (email/password AND Interactor SSO) end up storing a
 * long-lived pm_mobile_* Bearer token in SecureStore. This token is issued by
 * POST /api/v1/me/mobile-sessions on the product-manager backend and is what
 * every API call and SSE connection uses for auth.
 *
 * Email/password flow:
 *   1. GET /api/auth/csrf → CSRF cookie in iOS cookie jar
 *   2. POST /api/auth/callback/credentials → authjs.session-token cookie
 *   3. GET /api/auth/session → confirm session, get user id/email
 *   4. POST /api/v1/me/mobile-sessions (cookie jar auto-sends session) → pm_mobile_*
 *
 * Interactor SSO (Google) flow:
 *   1. expo-web-browser opens /api/auth/signin/interactor?callbackUrl=/api/auth/mobile-callback
 *   2. User signs in via OIDC → NextAuth sets session cookie in browser
 *   3. /api/auth/mobile-callback mints pm_mobile_* and redirects to buildapp://auth/callback?token=...
 *   4. openAuthSessionAsync captures the buildapp:// URL; we extract the token
 */
import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { API_BASE_URL } from "@/src/lib/config";

const SECURE_STORE_KEY = "pm_session_v3";

interface StoredSession {
  userId: string;
  email: string;
  name: string | null;
  mobileToken: string;
  mobileSessionId?: string;
}

interface NextAuthSession {
  user?: {
    id?: string;
    email?: string;
    name?: string | null;
  };
}

interface MobileSessionResponse {
  data?: {
    id?: string;
    token?: string;
  };
}

interface AuthState {
  email: string | null;
  userId: string | null;
  mobileToken: string | null;
  mobileSessionId: string | null;
  hydrated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  ssoSignIn: (token: string, email: string, userId: string) => Promise<void>;
  signOut: () => Promise<void>;
  hydrate: () => Promise<void>;
}

async function fetchCsrfToken(): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/api/auth/csrf`);
  const data = (await res.json()) as { csrfToken: string };
  return data.csrfToken;
}

async function fetchSession(): Promise<{ userId: string; email: string; name: string | null } | null> {
  const res = await fetch(`${API_BASE_URL}/api/auth/session`);
  const data = (await res.json()) as NextAuthSession | null;
  if (!data?.user?.id) return null;
  return {
    userId: data.user.id,
    email: data.user.email ?? "",
    name: data.user.name ?? null,
  };
}

async function exchangeForMobileToken(
  platform: string
): Promise<{ token: string; sessionId: string } | null> {
  const res = await fetch(`${API_BASE_URL}/api/v1/me/mobile-sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceName: "Build Mobile", platform }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as MobileSessionResponse;
  if (!data.data?.token || !data.data?.id) return null;
  return { token: data.data.token, sessionId: data.data.id };
}

async function validateMobileToken(token: string): Promise<boolean> {
  const res = await fetch(`${API_BASE_URL}/api/v1/me/mobile-sessions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  email: null,
  userId: null,
  mobileToken: null,
  mobileSessionId: null,
  hydrated: false,

  hydrate: async () => {
    const raw = await SecureStore.getItemAsync(SECURE_STORE_KEY).catch(() => null);
    if (raw) {
      try {
        const stored = JSON.parse(raw) as StoredSession;
        set({
          email: stored.email,
          userId: stored.userId,
          mobileToken: stored.mobileToken,
          mobileSessionId: stored.mobileSessionId ?? null,
          hydrated: true,
        });
        // Validate token in the background — clear state if revoked/expired
        validateMobileToken(stored.mobileToken)
          .then((valid) => {
            if (!valid) {
              set({ email: null, userId: null, mobileToken: null, mobileSessionId: null });
              void SecureStore.deleteItemAsync(SECURE_STORE_KEY);
            }
          })
          .catch(() => {});
        return;
      } catch {}
    }
    set({ hydrated: true });
  },

  signIn: async (email: string, password: string) => {
    // Step 1: CSRF token (also sets csrf cookie in iOS cookie jar)
    const csrfToken = await fetchCsrfToken();

    // Step 2: Credentials login — session cookie set in iOS cookie jar
    const body = new URLSearchParams({
      email,
      password,
      csrfToken,
      redirect: "false",
    });
    await fetch(`${API_BASE_URL}/api/auth/callback/credentials`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    // Step 3: Confirm session
    const session = await fetchSession();
    if (!session) throw new Error("Invalid email or password");

    // Step 4: Exchange session cookie for long-lived pm_mobile_* token
    const platform = Platform.OS === "ios" ? "ios" : "android";
    const exchange = await exchangeForMobileToken(platform);
    if (!exchange) throw new Error("Failed to initialize mobile session. Please try again.");

    const stored: StoredSession = {
      userId: session.userId,
      email: session.email,
      name: session.name,
      mobileToken: exchange.token,
      mobileSessionId: exchange.sessionId,
    };
    await SecureStore.setItemAsync(SECURE_STORE_KEY, JSON.stringify(stored));
    set({
      email: session.email,
      userId: session.userId,
      mobileToken: exchange.token,
      mobileSessionId: exchange.sessionId,
    });
  },

  ssoSignIn: async (token: string, email: string, userId: string) => {
    // token is already a pm_mobile_* token minted by GET /api/auth/mobile-callback
    const stored: StoredSession = {
      userId,
      email,
      name: null,
      mobileToken: token,
    };
    await SecureStore.setItemAsync(SECURE_STORE_KEY, JSON.stringify(stored));
    set({ email, userId, mobileToken: token, mobileSessionId: null });
  },

  signOut: async () => {
    const { mobileToken, mobileSessionId } = get();

    // Revoke the mobile session if we know its ID
    if (mobileToken && mobileSessionId) {
      fetch(`${API_BASE_URL}/api/v1/me/mobile-sessions/${mobileSessionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${mobileToken}` },
      }).catch(() => {});
    }

    await SecureStore.deleteItemAsync(SECURE_STORE_KEY).catch(() => {});
    set({ email: null, userId: null, mobileToken: null, mobileSessionId: null });
  },
}));

// Hydrate on startup — called once from the root layout
useAuthStore.getState().hydrate();
