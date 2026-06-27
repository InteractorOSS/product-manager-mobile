// Copyright (c) 2026 Interactor, Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert,
} from "react-native";
import { useAuthStore } from "@/src/store/auth";

export default function MeScreen() {
  const { email, signOut } = useAuthStore();

  function handleSignOut() {
    Alert.alert("Sign out", "Sign out of Build on this device?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => void signOut(),
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Me</Text>
      </View>

      {email && (
        <View style={styles.card}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>
              {email[0]?.toUpperCase() ?? "?"}
            </Text>
          </View>
          <Text style={styles.email}>{email}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.signOut} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  heading: { fontSize: 28, fontWeight: "700", color: "#1C1C1E" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#4CD964",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { fontSize: 20, fontWeight: "700", color: "#FFFFFF" },
  email: { fontSize: 15, color: "#1C1C1E", fontWeight: "500", flex: 1 },
  signOut: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: "#FF3B30",
    borderRadius: 9999,
    paddingVertical: 14,
    alignItems: "center",
  },
  signOutText: { color: "#FFFFFF", fontWeight: "600", fontSize: 16 },
});
