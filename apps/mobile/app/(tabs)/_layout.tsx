import { Tabs } from "expo-router";
import { View, Text } from "react-native";

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View className="items-center gap-0.5 pt-1">
      <Text className={`text-xl ${focused ? "opacity-100" : "opacity-40"}`}>
        {emoji}
      </Text>
      <Text
        className={`text-xs font-medium ${
          focused ? "text-brand-600" : "text-gray-400"
        }`}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#F3F4F6",
          height: 80,
          paddingBottom: 8,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🏠" label="Aujourd'hui" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📅" label="Calendrier" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📊" label="Tendances" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="⚙️" label="Réglages" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
