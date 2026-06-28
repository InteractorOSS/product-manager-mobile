// Copyright (c) 2026 Interactor, Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Auth store for the mobile companion app.
 *
 * Session strategy:
 *   - Login via POST /api/auth/callback/credentials → NextAuth sets the
 *     authjs.session-token cookie in iOS's NSURLSession shared cookie storage.
 *   - All subsequent fetch() calls to the same origin automatically include
 *     the cookie — no manual token forwarding needed.
 *   - We persist { userId, email } in SecureStore as the "logged-in marker"
 *     so we can restore the UI state without a network round-trip on every open.
 *   - On hydration, we validate with GET /api/auth/session to confirm the
 *     cookie is still valid.
 */
import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "@/src/lib/config";

const SECURE_STORE_KEY = "pm_session_user_v2";

interface StoredUser {
  userId: string;
  email: string;
  name: string | null;
}

interface NextAuthSession {
  user?: {
    id?: string;
    email?: string;
    name?: string | null;
  };
}

interface AuthState {
  email: string | null;
  userId: string | null;
  hydrated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  hydrate: () => Promise<void>;
}

async function fetchCsrfToken(): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/api/auth/csrf`);
  const data = (await res.json()) as { csrfToken: string };
  return data.csrfToken;
}

async function fetchSession(): Promise<StoredUser | null> {
  const res = await fetch(`${API_BASE_URL}/api/auth/session`);
  const data = (await res.json()) as NextAuthSession | null;
  if (!data?.user?.id) return null;
  return {
    userId: data.user.id,
    email: data.user.email ?? "",
    name: data.user.name ?? null,
  };
}

export const useAuthStore = create<AuthState>((set) => ({
  email: null,
  userId: null,
  hydrated: false,

  hydrate: async () => {
    // Fast path: restore from SecureStore without a network round-trip
    const raw = await SecureStore.getItemAsync(SECURE_STORE_KEY).catch(() => null);
    if (raw) {
      try {
        const user = JSON.parse(raw) as StoredUser;
        set({ email: user.email, userId: user.userId, hydrated: true });
        // Validate cookie is still active in the background
        fetchSession()
          .then((session) => {
            if (!session) {
              set({ email: null, userId: null });
              void SecureStore.deleteItemAsync(SECURE_STORE_KEY);
            }
          })
          .catch(() => {});
        return;
      } catch {}
    }
    // No stored user — check live session (e.g. reinstall with cookie still valid)
    const session = await fetchSession().catch(() => null);
    if (session) {
      set({ email: session.email, userId: session.userId, hydrated: true });
      void SecureStore.setItemAsync(SECURE_STORE_KEY, JSON.stringify(session));
    } else {
      set({ hydrated: true });
    }
  },

  signIn: async (email: string, password: string) => {
    // Step 1: get CSRF token — this also sets authjs.csrf-token in the cookie jar
    const csrfToken = await fetchCsrfToken();

    // Step 2: submit credentials — cookie jar automatically includes the CSRF
    // cookie; on success NextAuth sets authjs.session-token in the cookie jar
    const body = new URLSearchParams({ email, password, csrfToken, redirect: "false" });
    await fetch(`${API_BASE_URL}/api/auth/callback/credentials`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    // Step 3: confirm session was established (cookie jar auto-sends the new cookie)
    const session = await fetchSession();
    if (!session) throw new Error("Invalid email or password");

    await SecureStore.setItemAsync(SECURE_STORE_KEY, JSON.stringify(session));
    set({ email: session.email, userId: session.userId });
  },

  signOut: async () => {
    // POST to NextAuth signout — it responds with Set-Cookie: Max-Age=0
    // which clears the session cookie from the native cookie jar
    const csrfToken = await fetchCsrfToken().catch(() => "");
    await fetch(`${API_BASE_URL}/api/auth/signout`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ csrfToken }).toString(),
    }).catch(() => {});
    await SecureStore.deleteItemAsync(SECURE_STORE_KEY).catch(() => {});
    set({ email: null, userId: null });
  },
}));

// Hydrate on startup — called once from the root layout
useAuthStore.getState().hydrate();
