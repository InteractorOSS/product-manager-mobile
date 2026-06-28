// Copyright (c) 2026 Interactor, Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  View, Text, ScrollView, RefreshControl, ActivityIndicator, StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCounts, useTodos, useNotifications } from "@/src/lib/queries";

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, accent ? { color: accent } : undefined]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
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

  const totalTodos = counts.data?.globalTodosCount ?? 0;
  const unreadCount = notifications.data?.meta.unreadCount ?? 0;
  const approvalCount = (todos.data?.data ?? []).filter((t) => t.kind === "approval").length;
  const taskCount = (todos.data?.data ?? []).filter((t) => t.kind === "task").length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetchAll} tintColor="#4CD964" />}
      >
        <View style={styles.header}>
          <Text style={styles.heading}>Home</Text>
        </View>

        {isLoading ? (
          <View style={styles.center}><ActivityIndicator color="#4CD964" /></View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>Overview</Text>
            <View style={styles.statGrid}>
              <StatCard label="Todos" value={totalTodos} />
              <StatCard label="Approvals" value={approvalCount} accent={approvalCount > 0 ? "#FF9500" : undefined} />
              <StatCard label="Tasks" value={taskCount} />
              <StatCard label="Unread" value={unreadCount} accent={unreadCount > 0 ? "#4CD964" : undefined} />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  heading: { fontSize: 28, fontWeight: "700", color: "#1C1C1E" },
  sectionLabel: { fontSize: 13, fontWeight: "600", color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.5, marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, gap: 8 },
  statCard: { width: "47%", backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, alignItems: "center" },
  statValue: { fontSize: 36, fontWeight: "700", color: "#1C1C1E" },
  statLabel: { fontSize: 13, color: "#8E8E93", marginTop: 4 },
  center: { paddingTop: 60, alignItems: "center" },
});
