// Copyright (c) 2026 Interactor, Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { useEffect, useRef } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/src/store/auth";
import { registerPushToken } from "@/src/lib/push";
import { useNotificationSSE } from "@/src/lib/sse";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
    },
  },
});

/**
 * Handles navigation guard (unauthenticated → login, authenticated → tabs),
 * push registration, and SSE foreground connection.
 */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { mobileToken, userId, hydrated } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const prevToken = useRef<string | null>(null);

  // Navigation guard
  useEffect(() => {
    if (!hydrated) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!mobileToken && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (mobileToken && inAuthGroup) {
      router.replace("/(tabs)" as never);
    }
  }, [mobileToken, hydrated, segments, router]);

  // Register push token when the user first signs in (token transitions null → value)
  useEffect(() => {
    if (mobileToken && !prevToken.current) {
      void registerPushToken();
    }
    prevToken.current = mobileToken;
  }, [mobileToken]);

  // SSE foreground connection (noop when token/userId are null)
  useNotificationSSE();

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGuard>
        <Stack screenOptions={{ headerShown: false }} />
      </AuthGuard>
    </QueryClientProvider>
  );
}
