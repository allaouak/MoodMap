import { useEffect } from "react";
import { Slot, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
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
    <>
      <StatusBar style="auto" />
      <Slot />
    </>
  );
}
