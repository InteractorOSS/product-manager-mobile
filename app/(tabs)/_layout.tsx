// Copyright (c) 2026 Interactor, Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

const PRIMARY = "#4CD964";
const INACTIVE = "#8E8E93";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

function tabIcon(focused: boolean, active: IoniconName, inactive: IoniconName) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ({ color }: { color: any }) => (
    <Ionicons name={focused ? active : inactive} size={24} color={color as string} />
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
          title: "Overview",
          tabBarLabel: "Overview",
          tabBarIcon: ({ focused, color }) =>
            tabIcon(focused, "grid", "grid-outline")({ color }),
        }}
      />
      <Tabs.Screen
        name="goal"
        options={{
          title: "Goals",
          tabBarLabel: "Goal",
          tabBarIcon: ({ focused, color }) =>
            tabIcon(focused, "flag", "flag-outline")({ color }),
        }}
      />
      <Tabs.Screen
        name="approvals"
        options={{
          title: "Approvals",
          tabBarLabel: "Approval",
          tabBarIcon: ({ focused, color }) =>
            tabIcon(focused, "checkmark-circle", "checkmark-circle-outline")({ color }),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
          tabBarLabel: "Inbox",
          tabBarIcon: ({ focused, color }) =>
            tabIcon(focused, "notifications", "notifications-outline")({ color }),
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: "Me",
          tabBarLabel: "Me",
          tabBarIcon: ({ focused, color }) =>
            tabIcon(focused, "person", "person-outline")({ color }),
        }}
      />
    </Tabs>
  );
}
