import { useEffect } from "react";
import { Slot, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Linking from "expo-linking";
import "./global.css";
import { useAuthListener, useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useAuthListener();
  const { session, isLoading, isRecovery } = useAuth();

  // Interception des deep links de récupération de mot de passe
  // URL attendue : moodmap://reset-password?code=xxx (flux PKCE Supabase v2)
  useEffect(() => {
    const handleUrl = async (url: string) => {
      if (!url.includes("reset-password")) return;
      try {
        const normalized = url.replace("moodmap://", "https://x.placeholder/");
        const parsed = new URL(normalized);
        const code = parsed.searchParams.get("code");
        if (code) {
          // exchangeCodeForSession déclenche onAuthStateChange PASSWORD_RECOVERY
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
      <StatusBar style="auto" />
      <Slot />
    </>
  );
}
