import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";

export function useAuthListener() {
  const { setSession, setProfile, setLoading } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        authService
          .getProfile(session.user.id)
          .then(setProfile)
          .catch(console.error)
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session?.user) {
          authService
            .getProfile(session.user.id)
            .then(setProfile)
            .catch(console.error);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, [setSession, setProfile, setLoading]);
}

export function useAuth() {
  return useAuthStore();
}
