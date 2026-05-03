import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";

export function useAuthListener() {
  const { setSession, setProfile, setProfileError, setLoading, setRecovery } = useAuthStore();

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async (userId: string) => {
      try {
        const profile = await authService.getProfile(userId);
        if (!cancelled) setProfile(profile);
      } catch {
        if (!cancelled) setProfileError(true);
      }
    };

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Flux de récupération de mot de passe — ne pas rediriger vers les tabs
        if (event === "PASSWORD_RECOVERY") {
          setSession(session);
          setRecovery(true);
          setLoading(false);
          return;
        }

        setSession(session);
        setLoading(false);

        if (session?.user) {
          void loadProfile(session.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    const safetyTimer = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 3000);

    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
      listener.subscription.unsubscribe();
    };
  }, [setSession, setProfile, setProfileError, setLoading, setRecovery]);
}

export function useAuth() {
  return useAuthStore();
}
