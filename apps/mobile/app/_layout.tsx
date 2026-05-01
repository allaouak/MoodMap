import { useEffect } from "react";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "./global.css";
import { useAuthListener, useAuth } from "@/hooks/useAuth";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useAuthListener();
  const { session, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    SplashScreen.hideAsync();
    if (session) {
      router.replace("/(tabs)/");
    } else {
      router.replace("/(auth)/welcome");
    }
  }, [session, isLoading]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </GestureHandlerRootView>
  );
}
