// Copyright (c) 2026 Interactor, Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
  RefreshControl, StyleSheet, Modal, TextInput, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTodos, useDecideApproval, type TodoItem } from "@/src/lib/queries";

type ApprovalItem = Extract<TodoItem, { kind: "approval" }>;

function ApprovalCard({
  item,
  onApprove,
  onReject,
  isPending,
}: {
  item: ApprovalItem;
  onApprove: () => void;
  onReject: () => void;
  isPending: boolean;
}) {
  const daysAgo = Math.floor(
    (Date.now() - new Date(item.createdAt).getTime()) / 86_400_000
  );
  const timeLabel = daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : `${daysAgo}d ago`;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.iconWrap}>
          <Ionicons name="thumbs-up-outline" size={16} color="#FF9500" />
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardProject} numberOfLines={1}>
            {item.project.name} · {item.organization.name}
          </Text>
          <Text style={styles.cardTime}>{timeLabel}</Text>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.cardTitle} numberOfLines={3}>{item.title}</Text>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.rejectBtn}
          onPress={onReject}
          disabled={isPending}
          activeOpacity={0.75}
        >
          <Ionicons name="close" size={15} color="#FF3B30" />
          <Text style={styles.rejectText}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.approveBtn}
          onPress={onApprove}
          disabled={isPending}
          activeOpacity={0.75}
        >
          {isPending ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark" size={15} color="#FFFFFF" />
              <Text style={styles.approveText}>Approve</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ApprovalsScreen() {
  const { data, isLoading, isRefetching, refetch } = useTodos();
  const decide = useDecideApproval();

  const [pendingReject, setPendingReject] = useState<string | null>(null);
  const [comment, setComment] = useState("");

  const approvals = (data?.data ?? []).filter(
    (t): t is ApprovalItem => t.kind === "approval"
  );

  function handleApprove(id: string) {
    Alert.alert("Approve", "Approve this request?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Approve",
        onPress: () =>
          decide.mutate({ id, action: "grant" }, {
            onError: (e) => Alert.alert("Error", e.message),
          }),
      },
    ]);
  }

  function submitReject() {
    if (!pendingReject) return;
    decide.mutate(
      { id: pendingReject, action: "reject", comment: comment.trim() || undefined },
      {
        onSuccess: () => { setPendingReject(null); setComment(""); },
        onError: (e) => Alert.alert("Error", e.message),
      }
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.heading}>Approvals</Text>
        {approvals.length > 0 && (
          <View style={[styles.countBadge, { backgroundColor: "#FFF3E0" }]}>
            <Text style={[styles.countText, { color: "#FF9500" }]}>{approvals.length}</Text>
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#4CD964" size="large" />
        </View>
      ) : (
        <FlatList
          data={approvals}
          keyExtractor={(item) => item.id}
          contentContainerStyle={approvals.length === 0 ? styles.emptyFill : styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#4CD964" />
          }
          renderItem={({ item }) => (
            <ApprovalCard
              item={item}
              onApprove={() => handleApprove(item.id)}
              onReject={() => setPendingReject(item.id)}
              isPending={decide.isPending && decide.variables?.id === item.id}
            />
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="checkmark-circle" size={52} color="#4CD964" />
              <Text style={styles.emptyTitle}>All clear!</Text>
              <Text style={styles.emptySubtitle}>No pending approvals right now.</Text>
            </View>
          }
        />
      )}

      {/* Reject bottom sheet */}
      <Modal visible={!!pendingReject} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Reason for rejection</Text>
            <Text style={styles.modalSubtitle}>
              Optional — helps the requester understand the decision.
            </Text>
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment…"
              placeholderTextColor="#C7C7CC"
              multiline
              numberOfLines={4}
              value={comment}
              onChangeText={setComment}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => { setPendingReject(null); setComment(""); }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalReject}
                onPress={submitReject}
                disabled={decide.isPending}
              >
                {decide.isPending
                  ? <ActivityIndicator color="#FFFFFF" size="small" />
                  : <Text style={styles.modalRejectText}>Reject</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  countBadge: { borderRadius: 9999, paddingHorizontal: 8, paddingVertical: 2 },
  countText: { fontSize: 13, fontWeight: "600" },
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
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#FFF3E0",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardHeaderText: { flex: 1 },
  cardProject: { fontSize: 13, color: "#8E8E93", fontWeight: "500" },
  cardTime: { fontSize: 11, color: "#C7C7CC", marginTop: 1 },
  cardTitle: { fontSize: 15, fontWeight: "600", color: "#1C1C1E", lineHeight: 22, marginBottom: 14 },
  actions: { flexDirection: "row", gap: 8 },
  rejectBtn: {
    flex: 1,
    height: 42,
    borderRadius: 9999,
    backgroundColor: "#FFF0EF",
    borderWidth: 1,
    borderColor: "#FF3B30",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  rejectText: { fontWeight: "600", fontSize: 14, color: "#FF3B30" },
  approveBtn: {
    flex: 1,
    height: 42,
    borderRadius: 9999,
    backgroundColor: "#4CD964",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  approveText: { fontWeight: "600", fontSize: 14, color: "#FFFFFF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 },
  emptyFill: { flex: 1 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#1C1C1E", marginTop: 12 },
  emptySubtitle: { fontSize: 14, color: "#8E8E93", textAlign: "center", marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: "#E5E5EA",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1C1C1E", marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: "#8E8E93", marginBottom: 16 },
  commentInput: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#1C1C1E",
    minHeight: 100,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  modalActions: { flexDirection: "row", gap: 10 },
  modalCancel: {
    flex: 1,
    height: 48,
    borderRadius: 9999,
    backgroundColor: "#E5E5EA",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: { fontSize: 15, fontWeight: "600", color: "#1C1C1E" },
  modalReject: {
    flex: 1,
    height: 48,
    borderRadius: 9999,
    backgroundColor: "#FF3B30",
    alignItems: "center",
    justifyContent: "center",
  },
  modalRejectText: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },
});
