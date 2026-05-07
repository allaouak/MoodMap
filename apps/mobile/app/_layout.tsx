import { useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus, Platform, View } from "react-native";
import { Slot, router, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Linking from "expo-linking";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./global.css";
import { useAuthListener, useAuth } from "@/hooks/useAuth";
import { useContextualConsentsLoader } from "@/hooks/useContextualConsents";
import { useFlushOfflineQueue } from "@/hooks/useFlushOfflineQueue";
import { initSentry } from "@moodmap/config";
import { supabase } from "@/lib/supabase";
import { biometricService } from "@/services/biometric.service";
import { onboardingService } from "@/services/onboarding.service";
import { AppLockOverlay } from "@/components/layout/AppLockOverlay";
import { ErrorBoundary } from "@/components/layout/ErrorBoundary";

// Initialisation au plus tôt pour capturer les crashs dès le démarrage
initSentry();

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 2, // 2 hours
      networkMode: 'online', // Optimisation offline
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
    },
  },
});

export default function RootLayout() {
  useAuthListener();
  useContextualConsentsLoader();
  useFlushOfflineQueue();
  const { session, isLoading, isRecovery, setRecovery, lockEnabled, setLockEnabled } = useAuth();
  const segments = useSegments();
  const rootSegment = segments[0];
  const [isLocked, setIsLocked] = useState(false);
  const [lockChecked, setLockChecked] = useState(false);
  const [onboardingReady, setOnboardingReady] = useState(false);
  const [onboardingSeen, setOnboardingSeen] = useState(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  // Cache synchrone du statut verrou — évite un await dans le handler AppState
  const lockEnabledRef = useRef(false);
  // Empêche un double redirect si le watchdog et l'effet normal s'exécutent en concurrence
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    onboardingService
      .hasSeen()
      .then((seen) => {
        setOnboardingSeen(seen);
        setOnboardingReady(true);
      })
      .catch(() => {
        setOnboardingReady(true);
      });
  }, []);

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

  // Watchdog : si isLoading ou lockChecked ne se résolvent pas dans les 5s,
  // on force SplashScreen.hideAsync() et on redirige vers auth (fail closed).
  // En pratique, useAuthListener a déjà un timer 3s sur isLoading et le lock
  // check a un finally — ce guard couvre les edge cases inattendus.
  useEffect(() => {
    const watchdog = setTimeout(() => {
      if (!hasRedirectedRef.current) {
        hasRedirectedRef.current = true;
        void SplashScreen.hideAsync();
        router.replace("/(auth)/welcome");
      }
    }, 5000);
    return () => clearTimeout(watchdog);
  }, []);

  // Redirection selon l'état d'auth — attend aussi le verrou et le flag onboarding
  useEffect(() => {
    if (isLoading || !lockChecked || !onboardingReady) return;
    void SplashScreen.hideAsync();
    if (isRecovery) {
      router.replace("/(auth)/reset-password");
    } else if (session) {
      const target = onboardingSeen ? "(tabs)" : "(onboarding)";
      if (rootSegment !== target) {
        router.replace(onboardingSeen ? ("/(tabs)" as never) : ("/(onboarding)" as never));
      }
    } else if (rootSegment !== "(auth)") {
      router.replace("/(auth)/welcome");
    }
  }, [session, isLoading, isRecovery, lockChecked, onboardingReady, onboardingSeen, rootSegment]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <StatusBar style={isLocked ? "light" : "auto"} />
        <View
          style={{ flex: 1 }}
          pointerEvents={isLocked ? "none" : "box-none"}
          accessibilityElementsHidden={isLocked}
          {...(Platform.OS === "android" && {
            importantForAccessibility: isLocked ? "no-hide-descendants" : "auto",
          })}
        >
          <Slot />
        </View>
        {isLocked && <AppLockOverlay onUnlock={() => setIsLocked(false)} />}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
