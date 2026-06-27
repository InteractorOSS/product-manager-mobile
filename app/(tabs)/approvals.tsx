// Copyright (c) 2026 Interactor, Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
  RefreshControl, StyleSheet, SafeAreaView, Modal, TextInput, Alert,
} from "react-native";
import { useTodos, useDecideApproval, type TodoItem } from "@/src/lib/queries";

type ApprovalItem = Extract<TodoItem, { kind: "approval" }>;

function ApprovalRow({
  item,
  onDecide,
}: {
  item: ApprovalItem;
  onDecide: (id: string, action: "grant" | "reject") => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.rowProject}>{item.project.name} · {item.organization.name}</Text>
      <Text style={styles.rowDate}>
        Requested {new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
      </Text>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.rejectBtn]}
          onPress={() => onDecide(item.id, "reject")}
        >
          <Text style={[styles.actionText, styles.rejectText]}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.approveBtn]}
          onPress={() => onDecide(item.id, "grant")}
        >
          <Text style={[styles.actionText, styles.approveText]}>Approve</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ApprovalsScreen() {
  const { data, isLoading, isRefetching, refetch } = useTodos();
  const decide = useDecideApproval();

  const [pendingAction, setPendingAction] = useState<{ id: string; action: "grant" | "reject" } | null>(null);
  const [comment, setComment] = useState("");

  const approvals = (data?.data ?? []).filter(
    (t): t is ApprovalItem => t.kind === "approval"
  );

  function handleDecide(id: string, action: "grant" | "reject") {
    if (action === "reject") {
      setPendingAction({ id, action });
    } else {
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
  }

  function submitReject() {
    if (!pendingAction) return;
    decide.mutate(
      { id: pendingAction.id, action: "reject", comment: comment.trim() || undefined },
      {
        onSuccess: () => { setPendingAction(null); setComment(""); },
        onError: (e) => Alert.alert("Error", e.message),
      }
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Approvals</Text>
        {approvals.length > 0 && (
          <Text style={styles.count}>{approvals.length}</Text>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color="#4CD964" /></View>
      ) : (
        <FlatList
          data={approvals}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#4CD964" />}
          renderItem={({ item }) => <ApprovalRow item={item} onDecide={handleDecide} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No pending approvals</Text>
            </View>
          }
          contentContainerStyle={approvals.length === 0 ? styles.emptyFill : undefined}
        />
      )}

      {/* Reject with comment modal */}
      <Modal visible={!!pendingAction} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reason for rejection</Text>
            <Text style={styles.modalSubtitle}>Optional — helps the requester understand the decision.</Text>
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
                onPress={() => { setPendingAction(null); setComment(""); }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.rejectBtn, styles.modalSubmit]}
                onPress={submitReject}
                disabled={decide.isPending}
              >
                {decide.isPending
                  ? <ActivityIndicator color="#FF3B30" size="small" />
                  : <Text style={[styles.actionText, styles.rejectText]}>Reject</Text>
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
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  heading: { fontSize: 28, fontWeight: "700", color: "#1C1C1E" },
  count: { fontSize: 14, fontWeight: "600", color: "#8E8E93", backgroundColor: "#E5E5EA", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999 },
  row: { backgroundColor: "#FFFFFF", marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 14 },
  rowTitle: { fontSize: 15, fontWeight: "600", color: "#1C1C1E", marginBottom: 4 },
  rowProject: { fontSize: 12, color: "#8E8E93", marginBottom: 2 },
  rowDate: { fontSize: 12, color: "#C7C7CC", marginBottom: 12 },
  actions: { flexDirection: "row", gap: 8 },
  actionBtn: { flex: 1, height: 38, borderRadius: 9999, alignItems: "center", justifyContent: "center" },
  rejectBtn: { backgroundColor: "#FFF0EF", borderWidth: 1, borderColor: "#FF3B30" },
  approveBtn: { backgroundColor: "#4CD964" },
  actionText: { fontWeight: "600", fontSize: 14 },
  rejectText: { color: "#FF3B30" },
  approveText: { color: "#FFFFFF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyFill: { flex: 1 },
  emptyText: { fontSize: 16, color: "#8E8E93" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1C1C1E", marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: "#8E8E93", marginBottom: 16 },
  commentInput: { backgroundColor: "#F5F5F5", borderRadius: 12, padding: 12, fontSize: 15, color: "#1C1C1E", minHeight: 100, textAlignVertical: "top", marginBottom: 16 },
  modalActions: { flexDirection: "row", gap: 8 },
  modalCancel: { flex: 1, height: 44, borderRadius: 9999, backgroundColor: "#E5E5EA", alignItems: "center", justifyContent: "center" },
  modalCancelText: { fontSize: 15, fontWeight: "600", color: "#1C1C1E" },
  modalSubmit: { flex: 1, height: 44 },
});
