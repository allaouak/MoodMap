import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";

export function useAuthListener() {
  const { setSession, setProfile, setLoading } = useAuthStore();

  useEffect(() => {
    // onAuthStateChange fire INITIAL_SESSION au montage — pas besoin de getSession() séparé.
    // Évite la race condition entre getSession() et onAuthStateChange.
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session?.user) {
          try {
            const profile = await authService.getProfile(session.user.id);
            setProfile(profile);
          } catch {
            // Profil non bloquant — l'utilisateur peut continuer sans profil chargé
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
  }, [setSession, setProfile, setLoading]);
}

export function useAuth() {
  return useAuthStore();
}
