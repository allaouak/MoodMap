import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { usePathname, router } from "expo-router";

const TABS = [
  { path: "/", label: "Aujourd'hui", emoji: "🏠" },
  { path: "/calendar", label: "Calendrier", emoji: "📅" },
  { path: "/insights", label: "Tendances", emoji: "📊" },
  { path: "/settings", label: "Réglages", emoji: "⚙️" },
] as const;

export function BottomBar() {
  const pathname = usePathname();

  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const focused = pathname === tab.path;
        return (
          <TouchableOpacity
            key={tab.path}
            style={styles.tab}
            activeOpacity={0.7}
            onPress={() => router.replace(tab.path)}
          >
            <Text style={[styles.emoji, !focused && styles.dim]}>
              {tab.emoji}
            </Text>
            <Text style={[styles.label, { color: focused ? "#6D28D9" : "#9CA3AF" }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    height: 80,
    paddingBottom: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 4,
    gap: 2,
  },
  emoji: {
    fontSize: 20,
  },
  dim: {
    opacity: 0.35,
  },
  label: {
    fontSize: 11,
    fontWeight: "500",
  },
});
