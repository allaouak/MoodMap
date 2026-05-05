import { View, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

interface AppIconProps {
  name: IconName;
  color?: string;
  backgroundColor?: string;
  size?: number;
  frameSize?: number;
}

export function AppIcon({
  name,
  color = "#6D28D9",
  backgroundColor = "#F3E8FF",
  size = 24,
  frameSize = 48,
}: AppIconProps) {
  return (
    <View
      style={[
        styles.frame,
        {
          width: frameSize,
          height: frameSize,
          borderRadius: frameSize / 2,
          backgroundColor,
        },
      ]}
    >
      <MaterialCommunityIcons name={name} size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: "center",
    justifyContent: "center",
  },
});
