// Copyright (c) 2026 Interactor, Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Auth store — manages the long-lived pm_mobile_* session token.
 *
 * Login flow:
 *   1. POST credentials to /api/v1/admin/login on account-server → short-lived user JWT
 *   2. Decode the user JWT to extract userId + email (no library needed — public payload)
 *   3. Exchange the user JWT for a pm_mobile_* token via POST /api/v1/me/mobile-sessions
 *   4. Persist {token, userId, email} in expo-secure-store (iOS Keychain / Android Keystore)
 *
 * The pm_mobile_* token is long-lived (decoupled from the ~1h user JWT TTL) and
 * per-device revocable. It is the only credential stored; the user JWT is discarded
 * after exchange.
 */
import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { API_BASE_URL, ACCOUNT_SERVER_URL } from "@/src/lib/config";

const SECURE_STORE_KEY = "pm_mobile_session";

interface StoredSession {
  token: string;
  userId: string;
  email: string;
}

interface AuthState {
  token: string | null;
  userId: string | null;
  email: string | null;
  hydrated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  hydrate: () => Promise<void>;
}

function decodeJwtClaims(jwt: string): Record<string, unknown> {
  try {
    const payload = jwt.split(".")[1];
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    return JSON.parse(atob(padded.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return {};
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  userId: null,
  email: null,
  hydrated: false,

  hydrate: async () => {
    const raw = await SecureStore.getItemAsync(SECURE_STORE_KEY);
    if (raw) {
      try {
        const session = JSON.parse(raw) as StoredSession;
        set({ token: session.token, userId: session.userId, email: session.email, hydrated: true });
        return;
      } catch {}
    }
    // Legacy: single-value token stored under old key
    const legacy = await SecureStore.getItemAsync("pm_mobile_token");
    set({ token: legacy ?? null, hydrated: true });
  },

  signIn: async (emailInput: string, password: string) => {
    // Step 1: obtain short-lived user JWT from account-server
    const loginRes = await fetch(`${ACCOUNT_SERVER_URL}/api/v1/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailInput, password }),
    });
    if (!loginRes.ok) {
      const body = (await loginRes.json().catch(() => ({}))) as { message?: string };
      throw new Error(body.message ?? "Invalid credentials");
    }
    const { token: userJwt } = (await loginRes.json()) as { token: string };

    // Step 2: decode user JWT to get userId + email
    const claims = decodeJwtClaims(userJwt);
    const userId = (claims.sub as string) ?? "";
    const email = (claims.email as string) ?? emailInput;

    // Step 3: exchange user JWT for a long-lived pm_mobile_* session token
    const deviceName =
      Platform.OS === "ios" ? "Build iPhone" : "Build Android";
    const sessionRes = await fetch(`${API_BASE_URL}/api/v1/me/mobile-sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userJwt}`,
      },
      body: JSON.stringify({
        deviceName,
        platform: Platform.OS,
        appVersion: "1.0.0",
      }),
    });
    if (!sessionRes.ok) {
      const body = (await sessionRes.json().catch(() => ({}))) as { message?: string };
      throw new Error(body.message ?? "Session exchange failed");
    }
    const { token: mobileToken } = (await sessionRes.json()) as { token: string };

    const session: StoredSession = { token: mobileToken, userId, email };
    await SecureStore.setItemAsync(SECURE_STORE_KEY, JSON.stringify(session));
    set({ token: mobileToken, userId, email });
  },

  signOut: async () => {
    const { token } = get();
    if (token) {
      // Best-effort revoke — don't block sign-out if the server is unreachable
      fetch(`${API_BASE_URL}/api/v1/me/mobile-sessions/current`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    await SecureStore.deleteItemAsync(SECURE_STORE_KEY);
    await SecureStore.deleteItemAsync("pm_mobile_token"); // clear legacy key too
    set({ token: null, userId: null, email: null });
  },
}));

// Hydrate on startup — called once from the root layout
useAuthStore.getState().hydrate();
