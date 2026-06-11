import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";


export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: "rgba(10,14,20,0.98)",
          borderTopColor: "rgba(255,255,255,0.08)",
          borderTopWidth: 1,
          height: 88,
          paddingBottom: 24,
          paddingTop: 12,
          paddingLeft: 10,
          paddingRight: 10,
        },
        tabBarActiveTintColor: "#FF7828",
        tabBarInactiveTintColor: "rgba(255,255,255,0.3)",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          letterSpacing: 0.1,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="games"
        options={{
          title: "Today",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="baseball-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scores"
        options={{
          title: "Scores",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trophy-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="matchups"
        options={{
          title: "Analysis",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings-tab"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" size={size} color={color} />
          ),
        }}
      />
      {/* Hidden — content merged into matchups */}
      <Tabs.Screen name="props" options={{ href: null }} />
      <Tabs.Screen name="insights" options={{ href: null }} />
      <Tabs.Screen name="weather" options={{ href: null }} />
    </Tabs>
  );
}
