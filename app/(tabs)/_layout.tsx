// Copyright (c) 2026 Interactor, Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { Tabs } from "expo-router";
import { Platform } from "react-native";

const PRIMARY = "#4CD964";
const INACTIVE = "#8E8E93";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: PRIMARY,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: {
          borderTopColor: "#E5E5EA",
          backgroundColor: "#FFFFFF",
          paddingBottom: Platform.OS === "ios" ? 0 : 4,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Home", tabBarLabel: "Home" }}
      />
      <Tabs.Screen
        name="tasks"
        options={{ title: "My Tasks", tabBarLabel: "Tasks" }}
      />
      <Tabs.Screen
        name="approvals"
        options={{ title: "Approvals", tabBarLabel: "Approvals" }}
      />
      <Tabs.Screen
        name="inbox"
        options={{ title: "Inbox", tabBarLabel: "Inbox" }}
      />
      <Tabs.Screen
        name="me"
        options={{ title: "Me", tabBarLabel: "Me" }}
      />
    </Tabs>
  );
}
