// Copyright (c) 2026 Interactor, Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
  RefreshControl, StyleSheet, SafeAreaView,
} from "react-native";
import { useNotifications, useMarkNotificationRead, useMarkAllRead, type Notification } from "@/src/lib/queries";

function NotificationRow({ item, onRead }: { item: Notification; onRead: (id: string) => void }) {
  const unread = item.readAt === null;
  return (
    <TouchableOpacity
      style={[styles.row, unread && styles.rowUnread]}
      onPress={() => { if (unread) onRead(item.id); }}
      activeOpacity={0.7}
    >
      {unread && <View style={styles.unreadDot} />}
      <View style={styles.rowContent}>
        <Text style={[styles.rowTitle, !unread && styles.rowTitleRead]} numberOfLines={1}>
          {item.title}
        </Text>
        {item.message && (
          <Text style={styles.rowMessage} numberOfLines={2}>{item.message}</Text>
        )}
        <Text style={styles.rowTime}>
          {new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function InboxScreen() {
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { data, isLoading, isRefetching, refetch } = useNotifications(page, unreadOnly);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllRead();

  const unreadCount = data?.meta.unreadCount ?? 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Inbox</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={() => markAll.mutate()} disabled={markAll.isPending}>
            <Text style={styles.markAllText}>
              {markAll.isPending ? "Marking…" : "Mark all read"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterRow}>
        {(["All", "Unread"] as const).map((label) => {
          const isActive = label === "Unread" ? unreadOnly : !unreadOnly;
          return (
            <TouchableOpacity
              key={label}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => { setUnreadOnly(label === "Unread"); setPage(1); }}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {label}{label === "Unread" && unreadCount > 0 ? ` (${unreadCount})` : ""}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color="#4CD964" /></View>
      ) : (
        <FlatList
          data={data?.data ?? []}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#4CD964" />}
          renderItem={({ item }) => (
            <NotificationRow item={item} onRead={(id) => markRead.mutate(id)} />
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>{unreadOnly ? "All caught up!" : "No notifications yet"}</Text>
            </View>
          }
          contentContainerStyle={data?.data.length === 0 ? styles.emptyFill : undefined}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  heading: { fontSize: 28, fontWeight: "700", color: "#1C1C1E" },
  markAllText: { fontSize: 14, color: "#4CD964", fontWeight: "600" },
  filterRow: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 9999, backgroundColor: "#E5E5EA" },
  filterChipActive: { backgroundColor: "#4CD964" },
  filterChipText: { fontSize: 13, color: "#1C1C1E", fontWeight: "500" },
  filterChipTextActive: { color: "#FFFFFF" },
  row: { flexDirection: "row", alignItems: "flex-start", backgroundColor: "#FFFFFF", paddingHorizontal: 16, paddingVertical: 14, marginHorizontal: 16, marginBottom: 8, borderRadius: 12 },
  rowUnread: { borderLeftWidth: 3, borderLeftColor: "#4CD964" },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#4CD964", marginTop: 4, marginRight: 10 },
  rowContent: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: "600", color: "#1C1C1E", marginBottom: 2 },
  rowTitleRead: { fontWeight: "400", color: "#8E8E93" },
  rowMessage: { fontSize: 13, color: "#8E8E93", marginBottom: 4 },
  rowTime: { fontSize: 12, color: "#C7C7CC" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyFill: { flex: 1 },
  emptyText: { fontSize: 16, color: "#8E8E93" },
});
