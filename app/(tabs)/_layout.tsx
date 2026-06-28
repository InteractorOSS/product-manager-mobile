// Copyright (c) 2026 Interactor, Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

const PRIMARY = "#4CD964";
const INACTIVE = "#8E8E93";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

function icon(focused: boolean, on: IconName, off: IconName) {
  return ({ color }: { color: string }) => (
    <Ionicons name={focused ? on : off} size={24} color={color} />
  );
}

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
        options={{
          title: "Home",
          tabBarLabel: "Home",
          tabBarIcon: ({ focused, color }) =>
            icon(focused, "home", "home-outline")({ color }),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: "My Tasks",
          tabBarLabel: "Tasks",
          tabBarIcon: ({ focused, color }) =>
            icon(focused, "checkbox", "checkbox-outline")({ color }),
        }}
      />
      <Tabs.Screen
        name="approvals"
        options={{
          title: "Approvals",
          tabBarLabel: "Approvals",
          tabBarIcon: ({ focused, color }) =>
            icon(focused, "thumbs-up", "thumbs-up-outline")({ color }),
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: "Inbox",
          tabBarLabel: "Inbox",
          tabBarIcon: ({ focused, color }) =>
            icon(focused, "notifications", "notifications-outline")({ color }),
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: "Me",
          tabBarLabel: "Me",
          tabBarIcon: ({ focused, color }) =>
            icon(focused, "person", "person-outline")({ color }),
        }}
      />
    </Tabs>
  );
}
