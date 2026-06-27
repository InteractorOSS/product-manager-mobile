// Copyright (c) 2026 Interactor, Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useAuthStore } from "@/src/store/auth";
import { useOidcRequest, exchangeCodeForToken } from "@/src/lib/oidc";

export default function LoginScreen() {
  const { signIn, signInWithJwt } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oidcLoading, setOidcLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [request, response, promptAsync] = useOidcRequest();

  useEffect(() => {
    if (!response) return;
    if (response.type === "success") {
      const code = response.params.code;
      const verifier = request?.codeVerifier;
      if (!code || !verifier) {
        setError("OAuth response missing required parameters");
        return;
      }
      setOidcLoading(true);
      setError(null);
      exchangeCodeForToken(code, verifier)
        .then((jwt) => signInWithJwt(jwt))
        .catch((err) =>
          setError(err instanceof Error ? err.message : "Google sign-in failed"),
        )
        .finally(() => setOidcLoading(false));
    } else if (response.type === "error") {
      setError(response.error?.message ?? "Google sign-in failed");
    }
  }, [response]);

  async function handleSignIn() {
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    await promptAsync();
  }

  const busy = loading || oidcLoading;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>Build</Text>
        <Text style={styles.subtitle}>Project management for software teams</Text>

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.googleButton, busy && styles.buttonDisabled]}
          onPress={handleGoogleSignIn}
          disabled={busy || !request}
        >
          {oidcLoading ? (
            <ActivityIndicator color="#1C1C1E" />
          ) : (
            <>
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#8E8E93"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#8E8E93"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={handleSignIn}
        />

        <TouchableOpacity
          style={[styles.button, busy && styles.buttonDisabled]}
          onPress={handleSignIn}
          disabled={busy}
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
  inner: { flex: 1, justifyContent: "center", padding: 24 },
  title: {
    fontSize: 40,
    fontWeight: "800",
    color: "#1C1C1E",
    marginBottom: 8,
  },
  subtitle: { fontSize: 16, color: "#8E8E93", marginBottom: 40 },
  error: {
    color: "#FF3B30",
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
  },
  googleButton: {
    height: 52,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: "#E5E5EA",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 24,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: "800",
    color: "#4285F4",
  },
  googleButtonText: {
    color: "#1C1C1E",
    fontWeight: "600",
    fontSize: 16,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 12,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E5E5EA" },
  dividerText: { fontSize: 14, color: "#8E8E93" },
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
  button: {
    height: 52,
    borderRadius: 9999,
    backgroundColor: "#4CD964",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
});
