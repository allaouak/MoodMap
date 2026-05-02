import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";

export function useAuthListener() {
  const { setSession, setProfile, setProfileError, setLoading, setRecovery } = useAuthStore();

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Flux de récupération de mot de passe — ne pas rediriger vers les tabs
        if (event === "PASSWORD_RECOVERY") {
          setSession(session);
          setRecovery(true);
          setLoading(false);
          return;
        }

        setSession(session);

        if (session?.user) {
          try {
            const profile = await authService.getProfile(session.user.id);
            setProfile(profile);
          } catch {
            setProfileError(true);
          } finally {
            setLoading(false);
          }
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, [setSession, setProfile, setProfileError, setLoading, setRecovery]);
}

export function useAuth() {
  return useAuthStore();
}
