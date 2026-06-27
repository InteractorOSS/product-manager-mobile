// Copyright (c) 2026 Interactor, Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useAuthStore } from "@/src/store/auth";

export default function MeScreen() {
  const { signOut } = useAuthStore();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Me</Text>
      <TouchableOpacity style={styles.signOut} onPress={signOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5", padding: 16 },
  title: { fontSize: 28, fontWeight: "700", color: "#1C1C1E" },
  signOut: {
    marginTop: 32,
    backgroundColor: "#FF3B30",
    borderRadius: 9999,
    paddingVertical: 14,
    alignItems: "center",
  },
  signOutText: { color: "#FFFFFF", fontWeight: "600", fontSize: 16 },
});
