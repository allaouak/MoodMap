import { useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { Slot, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Linking from "expo-linking";
import "./global.css";
import { useAuthListener, useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { biometricService } from "@/services/biometric.service";
import { AppLockOverlay } from "@/components/layout/AppLockOverlay";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useAuthListener();
  const { session, isLoading, isRecovery } = useAuth();
  const [isLocked, setIsLocked] = useState(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Verrouillage au passage en arrière-plan
  useEffect(() => {
    const sub = AppState.addEventListener("change", async (nextState) => {
      const wasActive = appStateRef.current === "active";
      const goingBackground = nextState.match(/inactive|background/);

      if (wasActive && goingBackground) {
        const lockEnabled = await biometricService.getLockEnabled();
        if (lockEnabled) setIsLocked(true);
      }

      appStateRef.current = nextState;
    });

    return () => sub.remove();
  }, []);

  // Interception des deep links de récupération de mot de passe
  useEffect(() => {
    const handleUrl = async (url: string) => {
      if (!url.includes("reset-password")) return;
      try {
        const normalized = url.replace("moodmap://", "https://x.placeholder/");
        const parsed = new URL(normalized);
        const code = parsed.searchParams.get("code");
        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        }
      } catch {
        // URL mal formée — ignorer
      }
    };

    const subscription = Linking.addEventListener("url", ({ url }) =>
      handleUrl(url)
    );
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    return () => subscription.remove();
  }, []);

  // Redirection selon l'état d'auth
  useEffect(() => {
    if (isLoading) return;
    SplashScreen.hideAsync();
    if (isRecovery) {
      router.replace("/(auth)/reset-password");
    } else if (session) {
      router.replace("/(tabs)/");
    } else {
      router.replace("/(auth)/welcome");
    }
  }, [session, isLoading, isRecovery]);

  return (
    <>
      <StatusBar style={isLocked ? "light" : "auto"} />
      <Slot />
      {isLocked && <AppLockOverlay onUnlock={() => setIsLocked(false)} />}
    </>
  );
}
