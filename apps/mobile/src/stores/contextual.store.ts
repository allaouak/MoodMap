import { create } from "zustand";
import type { ContextualModule, ContextualEntry } from "@/types/contextual";

type Consents = Record<ContextualModule, boolean>;

interface ContextualState {
  consents: Consents;
  todayEntry: ContextualEntry | null;
  setConsent: (module: ContextualModule, enabled: boolean) => void;
  setConsents: (consents: Consents) => void;
  setTodayEntry: (entry: ContextualEntry | null) => void;
  reset: () => void;
}

const DEFAULT_CONSENTS: Consents = {
  sleep: false,
  activity: false,
  screen_time: false,
};

export const useContextualStore = create<ContextualState>((set) => ({
  consents: { ...DEFAULT_CONSENTS },
  todayEntry: null,
  setConsent: (module, enabled) =>
    set((s) => ({ consents: { ...s.consents, [module]: enabled } })),
  setConsents: (consents) => set({ consents }),
  setTodayEntry: (entry) => set({ todayEntry: entry }),
  reset: () => set({ consents: { ...DEFAULT_CONSENTS }, todayEntry: null }),
}));
