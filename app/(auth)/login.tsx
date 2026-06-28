// Copyright (c) 2026 Interactor, Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  type TextInput as TextInputType,
} from "react-native";
import { useAuthStore } from "@/src/store/auth";

export default function LoginScreen() {
  const { signIn } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<TextInputType>(null);

  async function handleSignIn() {
    if (!email.trim() || !password) return;
    setLoading(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.inner}>
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>B</Text>
          </View>
        </View>

        <Text style={styles.title}>Build</Text>
        <Text style={styles.subtitle}>Project management for software teams</Text>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TextInput
          style={[styles.input, !!error && styles.inputError]}
          placeholder="Email"
          placeholderTextColor="#8E8E93"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
          value={email}
          onChangeText={(v) => { setEmail(v); setError(null); }}
          onSubmitEditing={() => passwordRef.current?.focus()}
          editable={!loading}
        />
        <TextInput
          ref={passwordRef}
          style={[styles.input, !!error && styles.inputError]}
          placeholder="Password"
          placeholderTextColor="#8E8E93"
          secureTextEntry
          textContentType="password"
          returnKeyType="go"
          value={password}
          onChangeText={(v) => { setPassword(v); setError(null); }}
          onSubmitEditing={handleSignIn}
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.button, (loading || !email || !password) && styles.buttonDisabled]}
          onPress={handleSignIn}
          disabled={loading || !email || !password}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Sign in</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  inner: { flex: 1, justifyContent: "center", padding: 28 },
  logoWrap: { alignItems: "center", marginBottom: 24 },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "#4CD964",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { fontSize: 32, fontWeight: "800", color: "#FFFFFF" },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: "#1C1C1E",
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: "#8E8E93",
    textAlign: "center",
    marginBottom: 36,
  },
  errorBox: {
    backgroundColor: "#FFF0EF",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorText: { color: "#FF3B30", fontSize: 14, textAlign: "center" },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#1C1C1E",
    backgroundColor: "#F5F5F5",
    marginBottom: 12,
  },
  inputError: { borderColor: "#FF3B30" },
  button: {
    height: 52,
    borderRadius: 9999,
    backgroundColor: "#4CD964",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
});
