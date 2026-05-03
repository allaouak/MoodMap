import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  type ImageSourcePropType,
} from "react-native";
import { usePathname, router } from "expo-router";
import todayIcon from "../../../assets/images/tabs/today.png";
import calendarIcon from "../../../assets/images/tabs/calendar.png";
import insightsIcon from "../../../assets/images/tabs/insights.png";
import settingsIcon from "../../../assets/images/tabs/settings.png";

interface BottomTab {
  path: "/" | "/calendar" | "/insights" | "/settings";
  label: string;
  icon: ImageSourcePropType;
}

const TABS: readonly BottomTab[] = [
  {
    path: "/",
    label: "Aujourd'hui",
    icon: todayIcon,
  },
  {
    path: "/calendar",
    label: "Calendrier",
    icon: calendarIcon,
  },
  {
    path: "/insights",
    label: "Tendances",
    icon: insightsIcon,
  },
  {
    path: "/settings",
    label: "Réglages",
    icon: settingsIcon,
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
          >
            <View style={[styles.iconFrame, focused && styles.iconFrameFocused]}>
              <Image
                source={tab.icon}
                style={[styles.icon, !focused && styles.iconDim]}
                resizeMode="contain"
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
  icon: {
    width: 26,
    height: 26,
  },
  iconDim: {
    opacity: 0.58,
    transform: [{ scale: 0.92 }],
  },
  label: {
    fontSize: 11,
    fontWeight: "500",
  },
});
