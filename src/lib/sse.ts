// Copyright (c) 2026 Interactor, Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * SSE foreground connection for real-time notification updates.
 *
 * Connects to /api/sse/notifications:<userId> while the app is foregrounded.
 * Auth is sent as `Authorization: Bearer pm_mobile_*` — the same token used
 * by all other API calls. The SSE route accepts pm_mobile_* via resolveActor.
 * On each `realtime` event, invalidates the TanStack Query notification +
 * counts keys so all screens refresh live.
 */
import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import EventSource from "react-native-sse";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/src/store/auth";
import { API_BASE_URL } from "@/src/lib/config";

export function useNotificationSSE() {
  const { userId } = useAuthStore();
  const qc = useQueryClient();
  const esRef = useRef<EventSource | null>(null);
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  function connect() {
    const uid = userIdRef.current;
    const { mobileToken } = useAuthStore.getState();
    if (!uid) return;

    esRef.current?.close();
    const headers: Record<string, string> = {};
    if (mobileToken) {
      headers["Authorization"] = `Bearer ${mobileToken}`;
    }
    esRef.current = new EventSource(
      `${API_BASE_URL}/api/sse/notifications:${uid}`,
      { headers }
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
    if (!userId) {
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
  }, [userId]);
}
