// Copyright (c) 2026 Interactor, Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * TanStack Query hooks for the Build API.
 * All hooks read the pm_mobile_* token from the auth store via api.get/post/patch/delete.
 */
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/src/lib/api-client";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  readAt: string | null;
  createdAt: string;
  actionUrl: string | null;
  resourceType: string | null;
  resourceId: string | null;
}

export interface NotificationsResponse {
  data: Notification[];
  meta: { total: number; page: number; perPage: number; unreadCount: number };
}

export type TodoKind = "task" | "approval" | "decision_ack";
export type TodoPriority = "low" | "medium" | "high" | "urgent";

export interface TodoProject {
  id: string;
  name: string;
  slug: string;
  priority: number;
}

export interface TodoOrganization {
  id: string;
  name: string;
  slug: string;
}

export type TodoItem =
  | { kind: "task"; id: string; title: string; status: string; priority: TodoPriority; dueDate: string | null; project: TodoProject; organization: TodoOrganization }
  | { kind: "approval"; id: string; title: string; createdAt: string; project: TodoProject; organization: TodoOrganization }
  | { kind: "decision_ack"; id: string; decisionId: string; title: string; decidedAt: string | null; project: TodoProject; organization: TodoOrganization };

export interface TodosResponse {
  data: TodoItem[];
  facets: { organizations: unknown[]; projects: unknown[]; types: { kind: TodoKind; count: number }[] };
  meta: { total: number };
}

export interface GlobalCounts {
  globalTodosCount: number;
  perOrg: Record<string, { todosCount: number }>;
}

// ── Keys ─────────────────────────────────────────────────────────────────────

export const keys = {
  notifications: (page: number, unreadOnly?: boolean) =>
    ["notifications", page, unreadOnly] as const,
  todos: (scope: string) => ["todos", scope] as const,
  counts: () => ["counts"] as const,
};

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useNotifications(page = 1, unreadOnly = false) {
  return useQuery({
    queryKey: keys.notifications(page, unreadOnly),
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), perPage: "20" });
      if (unreadOnly) params.set("unreadOnly", "true");
      return api.get<NotificationsResponse>(`/api/v1/notifications?${params}`);
    },
  });
}

export function useTodos(scope = "global") {
  return useQuery({
    queryKey: keys.todos(scope),
    queryFn: () => api.get<TodosResponse>(`/api/v1/me/todos?scope=${scope}&sort=urgency&limit=100`),
  });
}

export function useCounts() {
  return useQuery({
    queryKey: keys.counts(),
    queryFn: () => api.get<GlobalCounts>("/api/v1/me/counts"),
    staleTime: 60_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/api/v1/notifications/${id}/read`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: keys.counts() });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/api/v1/notifications/read-all", {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: keys.counts() });
    },
  });
}

export function useDecideApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, comment }: { id: string; action: "grant" | "reject"; comment?: string }) =>
      api.post(`/api/v1/me/engine/approvals/${id}/decide`, { action, comment }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["todos"] });
      qc.invalidateQueries({ queryKey: keys.counts() });
    },
  });
}
