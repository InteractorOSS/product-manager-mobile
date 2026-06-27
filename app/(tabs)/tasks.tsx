// Copyright (c) 2026 Interactor, Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  View, Text, FlatList, ActivityIndicator,
  RefreshControl, StyleSheet, SafeAreaView,
} from "react-native";
import { useTodos, type TodoItem } from "@/src/lib/queries";

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "#FF3B30",
  high: "#FF9500",
  medium: "#4CD964",
  low: "#C7C7CC",
};

const STATUS_LABEL: Record<string, string> = {
  todo: "To do",
  in_progress: "In progress",
  in_review: "In review",
  blocked: "Blocked",
  done: "Done",
};

function TaskRow({ item }: { item: Extract<TodoItem, { kind: "task" }> }) {
  return (
    <View style={styles.row}>
      <View style={[styles.priorityBar, { backgroundColor: PRIORITY_COLOR[item.priority] ?? "#C7C7CC" }]} />
      <View style={styles.rowContent}>
        <Text style={styles.rowTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.rowMeta}>
          <Text style={styles.metaProject} numberOfLines={1}>{item.project.name}</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{STATUS_LABEL[item.status] ?? item.status}</Text>
          </View>
        </View>
        {item.dueDate && (
          <Text style={[styles.dueDate, new Date(item.dueDate) < new Date() && styles.dueDateOverdue]}>
            Due {new Date(item.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </Text>
        )}
      </View>
    </View>
  );
}

export default function TasksScreen() {
  const { data, isLoading, isRefetching, refetch } = useTodos();

  const tasks = (data?.data ?? []).filter(
    (t): t is Extract<TodoItem, { kind: "task" }> => t.kind === "task"
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>My Tasks</Text>
        {tasks.length > 0 && (
          <Text style={styles.count}>{tasks.length}</Text>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color="#4CD964" /></View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#4CD964" />}
          renderItem={({ item }) => <TaskRow item={item} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No tasks assigned to you</Text>
            </View>
          }
          contentContainerStyle={tasks.length === 0 ? styles.emptyFill : undefined}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  heading: { fontSize: 28, fontWeight: "700", color: "#1C1C1E" },
  count: { fontSize: 14, fontWeight: "600", color: "#8E8E93", backgroundColor: "#E5E5EA", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999 },
  row: { flexDirection: "row", backgroundColor: "#FFFFFF", marginHorizontal: 16, marginBottom: 8, borderRadius: 12, overflow: "hidden" },
  priorityBar: { width: 4 },
  rowContent: { flex: 1, padding: 14 },
  rowTitle: { fontSize: 15, fontWeight: "600", color: "#1C1C1E", marginBottom: 6 },
  rowMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  metaProject: { flex: 1, fontSize: 12, color: "#8E8E93" },
  statusBadge: { backgroundColor: "#F5F5F5", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  statusText: { fontSize: 11, color: "#8E8E93", fontWeight: "500" },
  dueDate: { fontSize: 12, color: "#8E8E93", marginTop: 4 },
  dueDateOverdue: { color: "#FF3B30", fontWeight: "600" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyFill: { flex: 1 },
  emptyText: { fontSize: 16, color: "#8E8E93" },
});
