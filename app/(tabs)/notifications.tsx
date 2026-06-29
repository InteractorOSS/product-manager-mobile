// Copyright (c) 2026 Interactor, Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
  RefreshControl, StyleSheet, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllRead,
  type Notification,
} from "@/src/lib/queries";

type Filter = "all" | "unread";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function NotifIcon({ type }: { type: string }) {
  if (type === "task_assigned")
    return <Ionicons name="person-add" size={16} color="#4CD964" />;
  if (type.startsWith("approval"))
    return <Ionicons name="checkmark-circle" size={16} color="#007AFF" />;
  if (type === "mention")
    return <Ionicons name="at-circle" size={16} color="#AF52DE" />;
  if (type === "flag_raised")
    return <Ionicons name="flag" size={16} color="#FF9500" />;
  if (type.startsWith("review_request"))
    return <Ionicons name="eye" size={16} color="#FF9500" />;
  if (type === "followed_item_updated")
    return <Ionicons name="bookmark" size={16} color="#007AFF" />;
  return <Ionicons name="notifications" size={16} color="#8E8E93" />;
}

function NotifRow({
  item,
  onRead,
  pending,
}: {
  item: Notification;
  onRead: (id: string) => void;
  pending: boolean;
}) {
  const isUnread = !item.readAt;
  return (
    <TouchableOpacity
      style={[styles.row, isUnread && styles.rowUnread]}
      onPress={() => { if (isUnread && !pending) onRead(item.id); }}
      activeOpacity={0.75}
    >
      {/* Icon */}
      <View style={[styles.iconWrap, isUnread ? styles.iconWrapUnread : styles.iconWrapRead]}>
        <NotifIcon type={item.type} />
      </View>

      {/* Content */}
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={[styles.rowTitle, isUnread && styles.rowTitleUnread]} numberOfLines={2}>
            {item.title}
          </Text>
          {isUnread && <View style={styles.unreadDot} />}
        </View>
        {item.message && (
          <Text style={styles.rowMessage} numberOfLines={1}>{item.message}</Text>
        )}
        <Text style={styles.rowTime}>{timeAgo(item.createdAt)}</Text>
      </View>

      {pending && (
        <ActivityIndicator size="small" color="#4CD964" style={styles.spinner} />
      )}
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);

  const { data, isLoading, isRefetching, refetch } = useNotifications(
    page,
    filter === "unread"
  );
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllRead();

  const notifications = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const unreadCount = data?.meta.unreadCount ?? 0;
  const totalPages = Math.ceil(total / (data?.meta.perPage ?? 20));

  function handleMarkAll() {
    Alert.alert("Mark all as read", "Mark all notifications as read?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Mark all",
        onPress: () =>
          markAll.mutate(undefined, {
            onError: () => Alert.alert("Error", "Could not mark notifications as read."),
          }),
      },
    ]);
  }

  function switchFilter(f: Filter) {
    setFilter(f);
    setPage(1);
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.heading}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllBtn}
            onPress={handleMarkAll}
            disabled={markAll.isPending}
            activeOpacity={0.7}
          >
            {markAll.isPending ? (
              <ActivityIndicator size="small" color="#4CD964" />
            ) : (
              <Ionicons name="checkmark-done" size={18} color="#4CD964" />
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Filter pills */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.pill, filter === "all" && styles.pillActive]}
          onPress={() => switchFilter("all")}
        >
          <Text style={[styles.pillText, filter === "all" && styles.pillTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.pill, filter === "unread" && styles.pillActive]}
          onPress={() => switchFilter("unread")}
        >
          <Text style={[styles.pillText, filter === "unread" && styles.pillTextActive]}>
            Unread{unreadCount > 0 ? ` (${unreadCount})` : ""}
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#4CD964" size="large" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => n.id}
          contentContainerStyle={
            notifications.length === 0 ? styles.emptyFill : styles.listContent
          }
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => { setPage(1); refetch(); }} tintColor="#4CD964" />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <NotifRow
              item={item}
              onRead={(id) => markRead.mutate(id)}
              pending={markRead.isPending && (markRead.variables === item.id)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="notifications-off-outline" size={52} color="#C7C7CC" />
              <Text style={styles.emptyTitle}>
                {filter === "unread" ? "All caught up!" : "No notifications"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {filter === "unread"
                  ? "You have no unread notifications."
                  : "You haven't received any notifications yet."}
              </Text>
            </View>
          }
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.pagRow}>
                <TouchableOpacity
                  style={[styles.pagBtn, page === 1 && styles.pagBtnDisabled]}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <Ionicons
                    name="chevron-back"
                    size={18}
                    color={page === 1 ? "#C7C7CC" : "#1C1C1E"}
                  />
                </TouchableOpacity>
                <Text style={styles.pagLabel}>
                  {page} / {totalPages}
                </Text>
                <TouchableOpacity
                  style={[styles.pagBtn, page >= totalPages && styles.pagBtnDisabled]}
                  onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={page >= totalPages ? "#C7C7CC" : "#1C1C1E"}
                  />
                </TouchableOpacity>
              </View>
            ) : null
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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  heading: { fontSize: 28, fontWeight: "700", color: "#1C1C1E" },
  badge: {
    backgroundColor: "#4CD964",
    borderRadius: 9999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: "center",
  },
  badgeText: { fontSize: 12, fontWeight: "700", color: "#FFFFFF" },
  markAllBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8F8EB",
    alignItems: "center",
    justifyContent: "center",
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9999,
    backgroundColor: "#E5E5EA",
  },
  pillActive: { backgroundColor: "#1C1C1E" },
  pillText: { fontSize: 13, fontWeight: "500", color: "#1C1C1E" },
  pillTextActive: { color: "#FFFFFF" },
  listContent: { paddingBottom: 24 },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowUnread: { backgroundColor: "#FAFFFE" },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  iconWrapUnread: { backgroundColor: "#E8F8EB" },
  iconWrapRead: { backgroundColor: "#F5F5F5" },
  rowContent: { flex: 1 },
  rowTop: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  rowTitle: { flex: 1, fontSize: 14, color: "#1C1C1E", lineHeight: 20 },
  rowTitleUnread: { fontWeight: "600" },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#4CD964",
    marginTop: 6,
    flexShrink: 0,
  },
  rowMessage: { fontSize: 13, color: "#8E8E93", marginTop: 3, lineHeight: 18 },
  rowTime: { fontSize: 11, color: "#C7C7CC", marginTop: 5 },
  spinner: { alignSelf: "center" },
  separator: { height: 1, backgroundColor: "#F5F5F5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 },
  emptyFill: { flex: 1 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#1C1C1E", marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: "#8E8E93", textAlign: "center", marginTop: 4 },
  pagRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 16,
  },
  pagBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  pagBtnDisabled: { backgroundColor: "#F5F5F5" },
  pagLabel: { fontSize: 13, color: "#8E8E93", fontWeight: "500" },
});
