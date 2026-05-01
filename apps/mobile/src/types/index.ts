export type MoodLevel = 1 | 2 | 3 | 4 | 5;
export type EnergyLevel = 1 | 2 | 3 | 4 | 5;
export type StressLevel = 1 | 2 | 3 | 4 | 5;

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  timezone: string;
  premium: boolean;
  created_at: string;
  updated_at: string;
}

export interface MoodEntry {
  id: string;
  user_id: string;
  mood: MoodLevel;
  energy: EnergyLevel;
  stress: StressLevel;
  note: string | null;
  tags: string[];
  entry_date: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMoodEntryInput {
  mood: MoodLevel;
  energy: EnergyLevel;
  stress: StressLevel;
  note?: string | undefined;
  tags?: string[] | undefined;
  entry_date: string;
}

export const MOOD_LABELS: Record<MoodLevel, string> = {
  1: "Très mal",
  2: "Pas bien",
  3: "Neutre",
  4: "Bien",
  5: "Excellent",
};

export const MOOD_EMOJI: Record<MoodLevel, string> = {
  1: "😔",
  2: "😕",
  3: "😐",
  4: "🙂",
  5: "😊",
};

export const MOOD_COLOR: Record<MoodLevel, string> = {
  1: "#F87171",
  2: "#F97316",
  3: "#FBBF24",
  4: "#60A5FA",
  5: "#34D399",
};
