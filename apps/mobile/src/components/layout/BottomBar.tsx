import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { usePathname, router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

interface BottomTab {
  path: "/" | "/calendar" | "/insights" | "/settings";
  label: string;
  icon: IconName;
  testID: string;
}

const TABS: readonly BottomTab[] = [
  {
    path: "/",
    label: "Aujourd'hui",
    icon: "home-heart",
    testID: "tab-today",
  },
  {
    path: "/calendar",
    label: "Calendrier",
    icon: "calendar-month-outline",
    testID: "tab-calendar",
  },
  {
    path: "/insights",
    label: "Tendances",
    icon: "chart-line",
    testID: "tab-insights",
  },
  {
    path: "/settings",
    label: "Réglages",
    icon: "cog-outline",
    testID: "tab-settings",
  },
];

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
            testID={tab.testID}
            accessibilityLabel={tab.label}
          >
            <View style={[styles.iconFrame, focused && styles.iconFrameFocused]}>
              <MaterialCommunityIcons
                name={tab.icon}
                size={24}
                color={focused ? "#6D28D9" : "#A78BFA"}
              />
            </View>
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
  iconFrame: {
    width: 36,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
  iconFrameFocused: {
    backgroundColor: "#F3E8FF",
  },
  label: {
    fontSize: 11,
    fontWeight: "500",
  },
});
