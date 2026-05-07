import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Session, User } from "@supabase/supabase-js";
import { Profile } from "@/types";
import { zustandSecureStorage } from "@/lib/secure-storage";

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isRecovery: boolean;
  profileError: boolean;
  lockEnabled: boolean;
  onboardingSeen: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setProfileError: (error: boolean) => void;
  setLockEnabled: (v: boolean) => void;
  setLoading: (loading: boolean) => void;
  setRecovery: (isRecovery: boolean) => void;
  setOnboardingSeen: (v: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      user: null,
      profile: null,
      isLoading: true,
      isRecovery: false,
      profileError: false,
      lockEnabled: false,
      onboardingSeen: false,
      setSession: (session) =>
        set({ session, user: session?.user ?? null }),
      setProfile: (profile) => set({ profile, profileError: false }),
      setProfileError: (profileError) => set({ profileError }),
      setLockEnabled: (lockEnabled) => set({ lockEnabled }),
      setLoading: (isLoading) => set({ isLoading }),
      setRecovery: (isRecovery) => set({ isRecovery }),
      setOnboardingSeen: (onboardingSeen) => set({ onboardingSeen }),
      reset: () =>
        set({
          session: null,
          user: null,
          profile: null,
          isLoading: false,
          isRecovery: false,
          profileError: false,
        }),
    }),
    {
      name: "moodmap.auth",
      storage: zustandSecureStorage,
      // session et user sont gérés par Supabase dans son propre SecureStore.
      // isLoading / isRecovery / profileError sont éphémères.
      partialize: (state) => ({
        profile: state.profile,
        lockEnabled: state.lockEnabled,
      }),
    }
  )
);
