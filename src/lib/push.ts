// Copyright (c) 2026 Interactor, Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Push notification registration.
 *
 * Called after login and on each app foreground. The Build API stores tokens
 * via UPSERT (keyed by mobileSessionId), so re-registration is safe and
 * ensures the token stays current.
 *
 * Fails silently on simulators and dev builds without EAS credentials —
 * the APNs/FCM token fetch simply throws and we swallow it.
 */
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { api } from "@/src/lib/api-client";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerPushToken(): Promise<void> {
  // Android requires an explicit channel for heads-up notifications
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Build notifications",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return;

  let pushToken: string;
  try {
    const result = await Notifications.getExpoPushTokenAsync();
    pushToken = result.data;
  } catch {
    // Simulators and builds without EAS projectId fail here — expected
    return;
  }

  // Register with Build backend (UPSERT by mobileSessionId)
  await api
    .post("/api/v1/me/devices", {
      pushToken,
      platform: Platform.OS,
      appVersion: "1.0.0",
    })
    .catch(() => {}); // best-effort — don't block the UI on network failure
}
