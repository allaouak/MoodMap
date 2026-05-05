export type ContextualModule = 'sleep' | 'activity' | 'screen_time';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active';

export interface SleepData {
  duration_min: number;
  bedtime: string;       // "HH:mm" heure locale
  wake_time: string;     // "HH:mm" heure locale
  quality: 1 | 2 | 3 | 4 | 5;
  source: 'healthkit' | 'health_connect' | 'manual';
}

export interface ActivityData {
  steps: number;
  active_min: number;
  training_min: number;
  level: ActivityLevel;
  source: 'healthkit' | 'health_connect' | 'manual';
}

export interface ScreenTimeData {
  total_min: number;
  source: 'manual';
}

export interface ContextualEntry {
  id: string;
  user_id: string;
  entry_date: string;
  sleep_duration_min: number | null;
  sleep_bedtime: string | null;
  sleep_wake_time: string | null;
  sleep_quality: number | null;
  sleep_source: string | null;
  activity_steps: number | null;
  activity_active_min: number | null;
  activity_training_min: number | null;
  activity_level: ActivityLevel | null;
  activity_source: string | null;
  screen_total_min: number | null;
  screen_source: string | null;
  created_at: string;
  updated_at: string;
}
