import { useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { Slot, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Linking from "expo-linking";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./global.css";
import { useAuthListener, useAuth } from "@/hooks/useAuth";
import { useContextualConsentsLoader } from "@/hooks/useContextualConsents";
import { supabase } from "@/lib/supabase";
import { biometricService } from "@/services/biometric.service";
import { AppLockOverlay } from "@/components/layout/AppLockOverlay";
import { initSentry } from "@/lib/sentry";

// Initialisation au plus tôt pour capturer les crashs dès le démarrage
initSentry();

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  useAuthListener();
  useContextualConsentsLoader();
  const { session, isLoading, isRecovery, setRecovery, lockEnabled, setLockEnabled } = useAuth();
  const [isLocked, setIsLocked] = useState(false);
  const [lockChecked, setLockChecked] = useState(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  // Cache synchrone du statut verrou — évite un await dans le handler AppState
  const lockEnabledRef = useRef(false);

  // Vérification du verrou au démarrage — avant d'afficher le contenu sensible
  useEffect(() => {
    let cancelled = false;
    biometricService
      .getLockEnabled()
      .then((enabled) => {
        if (cancelled) return;
        lockEnabledRef.current = enabled;
        setLockEnabled(enabled);
        if (enabled) setIsLocked(true);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLockChecked(true);
      });

    return () => {
      cancelled = true;
    };
  }, [setLockEnabled]);

  // Maintenir le ref en sync quand l'utilisateur active/désactive le verrou dans Settings
  useEffect(() => {
    lockEnabledRef.current = lockEnabled;
  }, [lockEnabled]);

  // Verrouillage dès "inactive" — iOS prend le snapshot multitâche à ce stade,
  // avant "background". Le ref évite tout await qui retarderait l'overlay.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      const wasActive = appStateRef.current === "active";
      const goingInactive = nextState === "inactive" || nextState === "background";

      if (wasActive && goingInactive && lockEnabledRef.current) {
        setIsLocked(true);
      }

      appStateRef.current = nextState;
    });

    return () => sub.remove();
  }, []);

  // Interception stricte des deep links de récupération de mot de passe.
  // Format attendu : moodmap://reset-password?code=<code_pkce>
  useEffect(() => {
    const handleUrl = async (url: string) => {
      let parsed: URL;
      try {
        if (url.startsWith("moodmap://")) {
          // Scheme custom — fallback dev / appareils sans App Links configurés
          parsed = new URL(url.replace("moodmap://", "https://moodmap.app/"));
        } else if (url.startsWith("https://moodmap.app/")) {
          // Universal Link (iOS) / App Link (Android) — chemin sécurisé
          parsed = new URL(url);
        } else {
          return;
        }
      } catch {
        return;
      }

      // Vérifier le path exact (pas de sous-path accepté)
      if (parsed.pathname !== "/reset-password") return;

      const code = parsed.searchParams.get("code");
      // Valider le format du code PKCE (alphanumérique + chars URL-safe)
      if (!code || !/^[A-Za-z0-9._~-]{10,512}$/.test(code)) return;

      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        // Force isRecovery même si onAuthStateChange émet SIGNED_IN au lieu de
        // PASSWORD_RECOVERY (edge case Supabase sur cold start ou token déjà échangé).
        if (!error && data.session) setRecovery(true);
      } catch {
        // Token invalide ou expiré — onAuthStateChange ne fired pas
      }
    };

    const subscription = Linking.addEventListener("url", ({ url }) =>
      handleUrl(url)
    );
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    return () => subscription.remove();
  }, [setRecovery]);

  // Redirection selon l'état d'auth — attend aussi que le verrou soit vérifié
  useEffect(() => {
    if (isLoading || !lockChecked) return;
    SplashScreen.hideAsync();
    if (isRecovery) {
      router.replace("/(auth)/reset-password");
    } else if (session) {
      router.replace("/(tabs)" as never);
    } else {
      router.replace("/(auth)/welcome");
    }
  }, [session, isLoading, isRecovery, lockChecked]);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style={isLocked ? "light" : "auto"} />
      <Slot />
      {isLocked && <AppLockOverlay onUnlock={() => setIsLocked(false)} />}
    </QueryClientProvider>
  );
}
