import { create } from "zustand";
import { Session, User } from "@supabase/supabase-js";
import { Profile } from "@/types";

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isRecovery: boolean;
  profileError: boolean;
  lockEnabled: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setProfileError: (error: boolean) => void;
  setLockEnabled: (v: boolean) => void;
  setLoading: (loading: boolean) => void;
  setRecovery: (isRecovery: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  isRecovery: false,
  profileError: false,
  lockEnabled: false,
  setSession: (session) =>
    set({ session, user: session?.user ?? null }),
  setProfile: (profile) => set({ profile, profileError: false }),
  setProfileError: (profileError) => set({ profileError }),
  setLockEnabled: (lockEnabled) => set({ lockEnabled }),
  setLoading: (isLoading) => set({ isLoading }),
  setRecovery: (isRecovery) => set({ isRecovery }),
  reset: () =>
    set({ session: null, user: null, profile: null, isLoading: false, isRecovery: false, profileError: false }),
}));
