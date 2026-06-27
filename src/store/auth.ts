// Copyright (c) 2026 Interactor, Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Auth store — manages the long-lived pm_mobile_* session token.
 *
 * Login flow:
 *   1. POST credentials to /api/v1/admin/login on account-server → short-lived user JWT
 *   2. Exchange the user JWT for a pm_mobile_* token via POST /api/v1/me/mobile-sessions
 *   3. Persist the pm_mobile_* token in expo-secure-store (iOS Keychain / Android Keystore)
 *
 * The pm_mobile_* token is long-lived (decoupled from the ~1h user JWT TTL) and
 * per-device revocable. It is the only credential stored; the user JWT is discarded
 * after exchange.
 */
import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL, ACCOUNT_SERVER_URL } from "@/src/lib/config";

const SECURE_STORE_KEY = "pm_mobile_token";

interface AuthState {
  token: string | null;
  hydrated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  hydrated: false,

  hydrate: async () => {
    const stored = await SecureStore.getItemAsync(SECURE_STORE_KEY);
    set({ token: stored ?? null, hydrated: true });
  },

  signIn: async (email: string, password: string) => {
    // Step 1: obtain short-lived user JWT from account-server
    const loginRes = await fetch(`${ACCOUNT_SERVER_URL}/api/v1/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!loginRes.ok) {
      const body = (await loginRes.json().catch(() => ({}))) as { message?: string };
      throw new Error(body.message ?? "Invalid credentials");
    }
    const { token: userJwt } = (await loginRes.json()) as { token: string };

    // Step 2: exchange user JWT for a long-lived pm_mobile_* session token
    const sessionRes = await fetch(`${API_BASE_URL}/api/v1/me/mobile-sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userJwt}`,
      },
      body: JSON.stringify({
        deviceName: "Build iOS",
        platform: "ios",
        appVersion: "1.0.0",
      }),
    });
    if (!sessionRes.ok) {
      const body = (await sessionRes.json().catch(() => ({}))) as { message?: string };
      throw new Error(body.message ?? "Session exchange failed");
    }
    const { token: mobileToken } = (await sessionRes.json()) as { token: string };

    await SecureStore.setItemAsync(SECURE_STORE_KEY, mobileToken);
    set({ token: mobileToken });
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
    set({ token: null });
  },
}));

// Hydrate on startup — called once from the root layout
useAuthStore.getState().hydrate();
