import { create } from "zustand";
import { Session, User } from "@supabase/supabase-js";
import { Profile } from "@/types";

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isRecovery: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
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
  setSession: (session) =>
    set({ session, user: session?.user ?? null }),
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),
  setRecovery: (isRecovery) => set({ isRecovery }),
  reset: () =>
    set({ session: null, user: null, profile: null, isLoading: false, isRecovery: false }),
}));
