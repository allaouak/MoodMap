import { Slot } from "expo-router";
import { View, StyleSheet } from "react-native";
import { BottomBar } from "@/components/layout/BottomBar";

export default function TabsLayout() {
  return (
    <View style={styles.root}>
      <Slot />
      <BottomBar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8F4FF",
  },
});
