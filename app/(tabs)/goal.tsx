// Copyright (c) 2026 Interactor, Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useGoals, type EngineGoal } from "@/src/lib/queries";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  open:        { label: "Open",        color: "#8E8E93", bg: "#F5F5F5" },
  in_progress: { label: "In Progress", color: "#007AFF", bg: "#EBF4FF" },
  accepted:    { label: "Accepted",    color: "#4CD964", bg: "#E8F8EB" },
  cancelled:   { label: "Cancelled",   color: "#FF3B30", bg: "#FFF0EF" },
};

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "#FF3B30",
  high:   "#FF9500",
  medium: "#FFCC00",
  low:    "#C7C7CC",
};

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentProps<typeof Ionicons>["name"] }> = {
  feature: { label: "Feature", color: "#007AFF", icon: "sparkles" },
  bug:     { label: "Bug",     color: "#FF3B30", icon: "bug" },
  chore:   { label: "Chore",   color: "#8E8E93", icon: "construct" },
};

const FILTERS = ["All", "Open", "In Progress", "Accepted"] as const;
type Filter = typeof FILTERS[number];

const FILTER_STATUS: Record<Filter, string | undefined> = {
  All:         undefined,
  Open:        "open",
  "In Progress": "in_progress",
  Accepted:    "accepted",
};

function GoalCard({ goal }: { goal: EngineGoal }) {
  const status = STATUS_CONFIG[goal.status] ?? STATUS_CONFIG.open;
  const type = TYPE_CONFIG[goal.type] ?? TYPE_CONFIG.chore;
  const priorityColor = PRIORITY_COLOR[goal.priority] ?? "#C7C7CC";
  const { doneTasks, totalTasks } = goal.completion;
  const progress = totalTasks > 0 ? doneTasks / totalTasks : 0;

  return (
    <View style={styles.card}>
      {/* Top row: number + title + priority dot */}
      <View style={styles.cardHeader}>
        <View style={[styles.typeBadge, { backgroundColor: type.color + "18" }]}>
          <Ionicons name={type.icon} size={11} color={type.color} />
          <Text style={[styles.typeBadgeText, { color: type.color }]}>{type.label}</Text>
        </View>
        {goal.displayNumber != null && (
          <Text style={styles.displayNumber}>G#{goal.displayNumber}</Text>
        )}
        <View style={{ flex: 1 }} />
        <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
      </View>

      <Text style={styles.cardTitle} numberOfLines={2}>{goal.title}</Text>

      {/* Status + owner row */}
      <View style={styles.cardMeta}>
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
        {goal.ownerName && (
          <Text style={styles.ownerText} numberOfLines={1}>{goal.ownerName}</Text>
        )}
        {goal.targetDate && (
          <Text style={styles.targetDate}>
            <Ionicons name="calendar-outline" size={11} color="#8E8E93" />
            {" "}{new Date(goal.targetDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </Text>
        )}
      </View>

      {/* Progress bar (only if tasks exist) */}
      {totalTasks > 0 && (
        <View style={styles.progressSection}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{doneTasks}/{totalTasks} tasks</Text>
        </View>
      )}
    </View>
  );
}

export default function GoalScreen() {
  const [filter, setFilter] = useState<Filter>("All");
  const { data, isLoading, isRefetching, refetch } = useGoals(undefined, FILTER_STATUS[filter]);

  const goals = data?.data ?? [];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.heading}>Goals</Text>
        {goals.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{goals.length}</Text>
          </View>
        )}
      </View>

      {/* Filter pills */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterPill, filter === f && styles.filterPillActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterPillText, filter === f && styles.filterPillTextActive]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#4CD964" size="large" />
        </View>
      ) : (
        <FlatList
          data={goals}
          keyExtractor={(g) => g.id}
          contentContainerStyle={goals.length === 0 ? styles.emptyFill : styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#4CD964" />
          }
          renderItem={({ item }) => <GoalCard goal={item} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="flag-outline" size={48} color="#C7C7CC" />
              <Text style={styles.emptyTitle}>No goals</Text>
              <Text style={styles.emptySubtitle}>
                {filter === "All" ? "No goals found across your projects." : `No ${filter.toLowerCase()} goals.`}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  heading: { fontSize: 28, fontWeight: "700", color: "#1C1C1E" },
  countBadge: {
    backgroundColor: "#E5E5EA",
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: { fontSize: 13, fontWeight: "600", color: "#8E8E93" },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: "#E5E5EA",
  },
  filterPillActive: { backgroundColor: "#1C1C1E" },
  filterPillText: { fontSize: 13, color: "#1C1C1E", fontWeight: "500" },
  filterPillTextActive: { color: "#FFFFFF" },
  listContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  typeBadgeText: { fontSize: 11, fontWeight: "600" },
  displayNumber: { fontSize: 12, color: "#8E8E93", fontWeight: "500" },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  cardTitle: { fontSize: 15, fontWeight: "600", color: "#1C1C1E", marginBottom: 10, lineHeight: 20 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 12, fontWeight: "600" },
  ownerText: { fontSize: 12, color: "#8E8E93", flex: 1 },
  targetDate: { fontSize: 12, color: "#8E8E93" },
  progressSection: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: "#E5E5EA",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: { height: 4, backgroundColor: "#4CD964", borderRadius: 2 },
  progressLabel: { fontSize: 11, color: "#8E8E93", width: 60, textAlign: "right" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 },
  emptyFill: { flex: 1 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#1C1C1E", marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: "#8E8E93", textAlign: "center", marginTop: 4 },
});
