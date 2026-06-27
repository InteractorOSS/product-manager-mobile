// Copyright (c) 2026 Interactor, Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * SSE foreground connection for real-time notification updates.
 *
 * Connects to /api/sse/notifications:<userId> with a Bearer pm_mobile_* token
 * while the app is foregrounded. On each `realtime` event, invalidates the
 * TanStack Query notification + counts keys so all screens refresh live.
 *
 * Lifecycle:
 *   - Connect when token + userId are available and app is active
 *   - Disconnect when app backgrounds (AppState != 'active')
 *   - Reconnect when app foregrounds again
 *   - Tear down on unmount / sign-out (token becomes null)
 */
import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import EventSource from "react-native-sse";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/src/store/auth";
import { API_BASE_URL } from "@/src/lib/config";

export function useNotificationSSE() {
  const { token, userId } = useAuthStore();
  const qc = useQueryClient();
  const esRef = useRef<EventSource | null>(null);
  // Keep latest token/userId accessible inside the AppState callback
  const tokenRef = useRef(token);
  const userIdRef = useRef(userId);
  tokenRef.current = token;
  userIdRef.current = userId;

  function connect() {
    const t = tokenRef.current;
    const uid = userIdRef.current;
    if (!t || !uid) return;

    esRef.current?.close();
    esRef.current = new EventSource(
      `${API_BASE_URL}/api/sse/notifications:${uid}`,
      { headers: { Authorization: `Bearer ${t}` } }
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    esRef.current.addEventListener("realtime" as any, () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
      void qc.invalidateQueries({ queryKey: ["counts"] });
    });
  }

  function disconnect() {
    esRef.current?.close();
    esRef.current = null;
  }

  useEffect(() => {
    if (!token || !userId) {
      disconnect();
      return;
    }

    connect();

    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") connect();
      else disconnect();
    });

    return () => {
      disconnect();
      sub.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, userId]);
}
