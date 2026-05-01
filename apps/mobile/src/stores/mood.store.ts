import { create } from "zustand";
import { MoodEntry } from "@/types";

interface MoodState {
  entries: MoodEntry[];
  todayEntry: MoodEntry | null;
  isLoading: boolean;
  setEntries: (entries: MoodEntry[]) => void;
  setTodayEntry: (entry: MoodEntry | null) => void;
  addEntry: (entry: MoodEntry) => void;
  updateEntry: (entry: MoodEntry) => void;
  setLoading: (loading: boolean) => void;
}

export const useMoodStore = create<MoodState>((set) => ({
  entries: [],
  todayEntry: null,
  isLoading: false,
  setEntries: (entries) => set({ entries }),
  setTodayEntry: (todayEntry) => set({ todayEntry }),
  addEntry: (entry) =>
    set((state) => ({ entries: [entry, ...state.entries] })),
  updateEntry: (entry) =>
    set((state) => ({
      entries: state.entries.map((e) => (e.id === entry.id ? entry : e)),
      todayEntry:
        state.todayEntry?.id === entry.id ? entry : state.todayEntry,
    })),
  setLoading: (isLoading) => set({ isLoading }),
}));
