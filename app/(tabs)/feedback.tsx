// Copyright (c) 2026 Interactor, Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
  RefreshControl, ScrollView, StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTodos, useFeedback, type FeedbackEntry } from "@/src/lib/queries";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  open:       { label: "Open",       color: "#8E8E93", bg: "#F5F5F5" },
  in_review:  { label: "In Review",  color: "#007AFF", bg: "#EBF4FF" },
  resolved:   { label: "Resolved",   color: "#4CD964", bg: "#E8F8EB" },
  declined:   { label: "Declined",   color: "#FF3B30", bg: "#FFF0EF" },
  planned:    { label: "Planned",    color: "#FF9500", bg: "#FFF3E0" },
};

const SOURCE_CONFIG: Record<string, { label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }> = {
  user:     { label: "User",     icon: "person" },
  slack:    { label: "Slack",    icon: "chatbubbles" },
  email:    { label: "Email",    icon: "mail" },
  meeting:  { label: "Meeting",  icon: "videocam" },
  support:  { label: "Support",  icon: "headset" },
  internal: { label: "Internal", icon: "business" },
};

function FeedbackCard({ item }: { item: FeedbackEntry }) {
  const status = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.open;
  const source = SOURCE_CONFIG[item.source] ?? SOURCE_CONFIG.user;
  const daysAgo = Math.floor(
    (Date.now() - new Date(item.createdAt).getTime()) / 86_400_000
  );
  const timeLabel = daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : `${daysAgo}d ago`;

  return (
    <View style={styles.card}>
      {/* Header row: source + time + vote count */}
      <View style={styles.cardHeader}>
        <View style={styles.sourceRow}>
          <Ionicons name={source.icon} size={13} color="#8E8E93" />
          <Text style={styles.sourceText}>{source.label}</Text>
          {item.authorName && (
            <Text style={styles.authorText} numberOfLines={1}> · {item.authorName}</Text>
          )}
        </View>
        <View style={styles.metaRight}>
          {item.voteCount > 0 && (
            <View style={styles.voteWrap}>
              <Ionicons name="arrow-up" size={11} color="#007AFF" />
              <Text style={styles.voteText}>{item.voteCount}</Text>
            </View>
          )}
          <Text style={styles.timeText}>{timeLabel}</Text>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>

      {/* Body preview */}
      {item.body && (
        <Text style={styles.cardBody} numberOfLines={2}>{item.body}</Text>
      )}

      {/* Footer: status badge + rating */}
      <View style={styles.cardFooter}>
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
        {item.rating != null && (
          <View style={styles.ratingWrap}>
            <Ionicons name="star" size={12} color="#FFCC00" />
            <Text style={styles.ratingText}>{item.rating}/5</Text>
          </View>
        )}
        {item.groupName && (
          <Text style={styles.groupText} numberOfLines={1}>{item.groupName}</Text>
        )}
      </View>
    </View>
  );
}

export default function FeedbackScreen() {
  const { data: todosData } = useTodos();
  const projects = todosData?.facets.projects ?? [];

  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => projects[0]?.id ?? "");
  const activeProjectId = selectedProjectId || projects[0]?.id || "";

  const { data, isLoading, isRefetching, refetch } = useFeedback(activeProjectId);
  const feedback = data?.data ?? [];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.heading}>Feedback</Text>
        {feedback.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{feedback.length}</Text>
          </View>
        )}
      </View>

      {/* Project picker */}
      {projects.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.projectRow}
          style={styles.projectScroll}
        >
          {projects.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.projectPill, activeProjectId === p.id && styles.projectPillActive]}
              onPress={() => setSelectedProjectId(p.id)}
            >
              <Text
                style={[styles.projectPillText, activeProjectId === p.id && styles.projectPillTextActive]}
                numberOfLines={1}
              >
                {p.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* No projects fallback */}
      {projects.length === 0 && !isLoading && (
        <View style={styles.center}>
          <Ionicons name="folder-open-outline" size={48} color="#C7C7CC" />
          <Text style={styles.emptyTitle}>No projects</Text>
          <Text style={styles.emptySubtitle}>
            You are not assigned to any projects yet.
          </Text>
        </View>
      )}

      {/* Feedback list */}
      {projects.length > 0 && (
        isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#4CD964" size="large" />
          </View>
        ) : (
          <FlatList
            data={feedback}
            keyExtractor={(item) => item.id}
            contentContainerStyle={feedback.length === 0 ? styles.emptyFill : styles.listContent}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#4CD964" />
            }
            renderItem={({ item }) => <FeedbackCard item={item} />}
            ListEmptyComponent={
              <View style={styles.center}>
                <Ionicons name="chatbubble-ellipses-outline" size={48} color="#C7C7CC" />
                <Text style={styles.emptyTitle}>No feedback</Text>
                <Text style={styles.emptySubtitle}>
                  No feedback has been submitted for this project yet.
                </Text>
              </View>
            }
          />
        )
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
  projectScroll: { maxHeight: 44 },
  projectRow: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 12,
  },
  projectPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9999,
    backgroundColor: "#E5E5EA",
    maxWidth: 200,
  },
  projectPillActive: { backgroundColor: "#1C1C1E" },
  projectPillText: { fontSize: 13, color: "#1C1C1E", fontWeight: "500" },
  projectPillTextActive: { color: "#FFFFFF" },
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
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sourceRow: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1 },
  sourceText: { fontSize: 12, color: "#8E8E93", fontWeight: "500" },
  authorText: { fontSize: 12, color: "#8E8E93", flex: 1 },
  metaRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  voteWrap: { flexDirection: "row", alignItems: "center", gap: 2 },
  voteText: { fontSize: 12, color: "#007AFF", fontWeight: "600" },
  timeText: { fontSize: 11, color: "#C7C7CC" },
  cardTitle: { fontSize: 15, fontWeight: "600", color: "#1C1C1E", marginBottom: 6, lineHeight: 22 },
  cardBody: { fontSize: 13, color: "#8E8E93", lineHeight: 18, marginBottom: 12 },
  cardFooter: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 12, fontWeight: "600" },
  ratingWrap: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingText: { fontSize: 12, color: "#8E8E93" },
  groupText: { fontSize: 12, color: "#8E8E93", flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 },
  emptyFill: { flex: 1 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#1C1C1E", marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: "#8E8E93", textAlign: "center", marginTop: 4 },
});
