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
import * as WebBrowser from "expo-web-browser";
import { useAuthStore } from "@/src/store/auth";
import { API_BASE_URL } from "@/src/lib/config";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { signIn, ssoSignIn } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(false);
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

  async function handleSSO() {
    setSsoLoading(true);
    setError(null);
    try {
      // callbackUrl points to the backend route that mints pm_mobile_* and
      // redirects to buildapp://auth/callback?token=...&email=...&userId=...
      const platform = Platform.OS === "ios" ? "ios" : "android";
      const callbackUrl = encodeURIComponent(
        `/api/auth/mobile-callback?platform=${platform}`
      );
      const signInUrl = `${API_BASE_URL}/api/auth/signin/interactor?callbackUrl=${callbackUrl}`;

      const result = await WebBrowser.openAuthSessionAsync(signInUrl, "buildapp");

      if (result.type !== "success" || !result.url) {
        // User cancelled or error — no action needed
        return;
      }

      // Parse buildapp://auth/callback?token=pm_mobile_*&email=...&userId=...
      const url = new URL(result.url);
      const token = url.searchParams.get("token");
      const ssoEmail = url.searchParams.get("email");
      const userId = url.searchParams.get("userId");

      if (!token?.startsWith("pm_mobile_") || !ssoEmail || !userId) {
        setError("Sign in failed. Please try again.");
        return;
      }

      await ssoSignIn(token, ssoEmail, userId);
    } catch {
      setError("Sign in failed. Please try again.");
    } finally {
      setSsoLoading(false);
    }
  }

  const busy = loading || ssoLoading;

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

        {/* Interactor SSO (Google + others) */}
        <TouchableOpacity
          style={[styles.ssoButton, busy && styles.buttonDisabled]}
          onPress={handleSSO}
          disabled={busy}
          activeOpacity={0.85}
        >
          {ssoLoading ? (
            <ActivityIndicator color="#1C1C1E" />
          ) : (
            <>
              <View style={styles.ssoIcon}>
                <Text style={styles.ssoIconText}>I</Text>
              </View>
              <Text style={styles.ssoButtonText}>Sign in with Interactor SSO</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with email</Text>
          <View style={styles.dividerLine} />
        </View>

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
          editable={!busy}
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
          editable={!busy}
        />

        <TouchableOpacity
          style={[styles.button, (busy || !email || !password) && styles.buttonDisabled]}
          onPress={handleSignIn}
          disabled={busy || !email || !password}
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
    marginBottom: 28,
  },
  ssoButton: {
    height: 52,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 20,
  },
  ssoIcon: {
    width: 22,
    height: 22,
    borderRadius: 4,
    backgroundColor: "#4CD964",
    alignItems: "center",
    justifyContent: "center",
  },
  ssoIconText: { color: "#FFFFFF", fontWeight: "800", fontSize: 12 },
  ssoButtonText: { color: "#1C1C1E", fontWeight: "500", fontSize: 15 },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E5E5EA" },
  dividerText: { color: "#8E8E93", fontSize: 12 },
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
