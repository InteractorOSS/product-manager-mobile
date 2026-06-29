// Copyright (c) 2026 Interactor, Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useCounts, useTodos, useNotifications, type TodoItem } from "@/src/lib/queries";
import { useAuthStore } from "@/src/store/auth";

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "#FF3B30",
  high: "#FF9500",
  medium: "#FFCC00",
  low: "#C7C7CC",
};

const STATUS_LABEL: Record<string, string> = {
  todo: "To do",
  in_progress: "In progress",
  in_review: "In review",
  blocked: "Blocked",
  done: "Done",
};

function StatCard({
  icon,
  label,
  value,
  accent,
  bg,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: number;
  accent: string;
  bg: string;
}) {
  return (
    <View style={[styles.statCard, { borderLeftColor: accent, borderLeftWidth: 3 }]}>
      <View style={[styles.statIconWrap, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={18} color={accent} />
      </View>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function TodoRow({ item }: { item: TodoItem }) {
  if (item.kind === "approval") {
    return (
      <View style={styles.todoRow}>
        <View style={[styles.kindDot, { backgroundColor: "#FF9500" }]} />
        <View style={styles.todoContent}>
          <Text style={styles.todoTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.todoMeta}>{item.project.name} · Approval</Text>
        </View>
        <View style={[styles.kindBadge, { backgroundColor: "#FFF3E0" }]}>
          <Text style={[styles.kindBadgeText, { color: "#FF9500" }]}>Approval</Text>
        </View>
      </View>
    );
  }
  if (item.kind === "decision_ack") {
    return (
      <View style={styles.todoRow}>
        <View style={[styles.kindDot, { backgroundColor: "#AF52DE" }]} />
        <View style={styles.todoContent}>
          <Text style={styles.todoTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.todoMeta}>{item.project.name} · Decision</Text>
        </View>
        <View style={[styles.kindBadge, { backgroundColor: "#F5E6FF" }]}>
          <Text style={[styles.kindBadgeText, { color: "#AF52DE" }]}>Decision</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.todoRow}>
      <View style={[styles.kindDot, { backgroundColor: PRIORITY_COLOR[item.priority] ?? "#C7C7CC" }]} />
      <View style={styles.todoContent}>
        <Text style={styles.todoTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.todoMeta}>{item.project.name} · {STATUS_LABEL[item.status] ?? item.status}</Text>
      </View>
      {item.dueDate && (
        <Text style={[
          styles.dueLabel,
          new Date(item.dueDate) < new Date() && styles.dueLabelOverdue,
        ]}>
          {new Date(item.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </Text>
      )}
    </View>
  );
}

export default function OverviewScreen() {
  const { email } = useAuthStore();
  const counts = useCounts();
  const todos = useTodos();
  const notifications = useNotifications(1);

  const isLoading = counts.isLoading || todos.isLoading || notifications.isLoading;
  const isRefetching = counts.isRefetching || todos.isRefetching || notifications.isRefetching;

  function refetchAll() {
    counts.refetch();
    todos.refetch();
    notifications.refetch();
  }

  const allTodos = todos.data?.data ?? [];
  const unreadCount = notifications.data?.meta.unreadCount ?? 0;
  const approvalCount = allTodos.filter((t) => t.kind === "approval").length;
  const taskCount = allTodos.filter((t) => t.kind === "task").length;
  const totalTodos = counts.data?.globalTodosCount ?? 0;

  const firstName = email?.split("@")[0]?.split(".")[0] ?? "";
  const greeting = firstName
    ? `Hi, ${firstName.charAt(0).toUpperCase() + firstName.slice(1)}`
    : "Overview";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetchAll} tintColor="#4CD964" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.subGreeting}>Here's what needs your attention</Text>
          </View>
          {unreadCount > 0 && (
            <View style={styles.bellWrap}>
              <Ionicons name="notifications" size={22} color="#1C1C1E" />
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
              </View>
            </View>
          )}
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#4CD964" size="large" />
          </View>
        ) : (
          <>
            {/* Stats grid */}
            <Text style={styles.sectionLabel}>Summary</Text>
            <View style={styles.statGrid}>
              <StatCard icon="list" label="Todos" value={totalTodos} accent="#007AFF" bg="#EBF4FF" />
              <StatCard icon="thumbs-up" label="Approvals" value={approvalCount} accent={approvalCount > 0 ? "#FF9500" : "#C7C7CC"} bg={approvalCount > 0 ? "#FFF3E0" : "#F5F5F5"} />
              <StatCard icon="checkbox" label="Tasks" value={taskCount} accent="#4CD964" bg="#E8F8EB" />
              <StatCard icon="notifications" label="Unread" value={unreadCount} accent={unreadCount > 0 ? "#4CD964" : "#C7C7CC"} bg={unreadCount > 0 ? "#E8F8EB" : "#F5F5F5"} />
            </View>

            {/* Recent todos */}
            {allTodos.length > 0 && (
              <>
                <View style={styles.sectionRow}>
                  <Text style={styles.sectionLabel}>Recent</Text>
                  <Text style={styles.sectionCount}>{allTodos.length} items</Text>
                </View>
                <View style={styles.todoList}>
                  {allTodos.slice(0, 8).map((item) => (
                    <TodoRow key={item.id} item={item} />
                  ))}
                  {allTodos.length > 8 && (
                    <View style={styles.moreRow}>
                      <Text style={styles.moreText}>+{allTodos.length - 8} more items</Text>
                    </View>
                  )}
                </View>
              </>
            )}

            {allTodos.length === 0 && !isLoading && (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle" size={48} color="#4CD964" />
                <Text style={styles.emptyTitle}>All caught up!</Text>
                <Text style={styles.emptySubtitle}>No pending todos across your projects.</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  greeting: { fontSize: 26, fontWeight: "700", color: "#1C1C1E" },
  subGreeting: { fontSize: 13, color: "#8E8E93", marginTop: 2 },
  bellWrap: { position: "relative", padding: 4 },
  bellBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#4CD964",
    borderRadius: 9999,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  bellBadgeText: { fontSize: 10, fontWeight: "700", color: "#FFFFFF" },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#8E8E93",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 8,
  },
  sectionCount: { fontSize: 12, color: "#8E8E93" },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 24,
  },
  statCard: {
    width: "47%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  statValue: { fontSize: 32, fontWeight: "700", color: "#1C1C1E", marginBottom: 2 },
  statLabel: { fontSize: 12, color: "#8E8E93", fontWeight: "500" },
  todoList: { marginHorizontal: 16, gap: 1, borderRadius: 16, overflow: "hidden", marginBottom: 24 },
  todoRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },
  kindDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  todoContent: { flex: 1 },
  todoTitle: { fontSize: 14, fontWeight: "500", color: "#1C1C1E", marginBottom: 2 },
  todoMeta: { fontSize: 12, color: "#8E8E93" },
  kindBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  kindBadgeText: { fontSize: 11, fontWeight: "600" },
  dueLabel: { fontSize: 11, color: "#8E8E93", fontWeight: "500" },
  dueLabelOverdue: { color: "#FF3B30", fontWeight: "600" },
  moreRow: { backgroundColor: "#FFFFFF", paddingVertical: 12, alignItems: "center" },
  moreText: { fontSize: 13, color: "#8E8E93" },
  center: { paddingTop: 60, alignItems: "center" },
  emptyState: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#1C1C1E", marginTop: 12 },
  emptySubtitle: { fontSize: 14, color: "#8E8E93", textAlign: "center", marginTop: 6 },
});
