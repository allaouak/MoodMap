import type { ContextualEntry } from "@/types/contextual";
import type { MoodEntry } from "@/types";

export function formatHoursFromMinutes(minutes: number): string {
  const hours = minutes / 60;
  return `${hours.toFixed(hours >= 10 ? 0 : 1)} h`;
}

export function formatSleepDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

export function hasContextualData(entry: ContextualEntry | null | undefined): boolean {
  return Boolean(
    entry?.sleep_duration_min != null ||
    entry?.activity_steps != null ||
    entry?.screen_total_min != null
  );
}

export function contextualEntryForDate(
  entries: ContextualEntry[],
  date: string
): ContextualEntry | undefined {
  return entries.find((entry) => entry.entry_date === date);
}

export function buildScreenTimeObservation(
  moodEntries: MoodEntry[],
  contextualEntries: ContextualEntry[]
): string | null {
  const moodByDate = new Map(moodEntries.map((entry) => [entry.entry_date, entry]));
  const paired = contextualEntries
    .map((context) => ({
      context,
      mood: moodByDate.get(context.entry_date),
    }))
    .filter((item): item is { context: ContextualEntry; mood: MoodEntry } =>
      item.mood != null && item.context.screen_total_min != null
    );

  if (paired.length < 3) {
    return null;
  }

  const sorted = [...paired].sort(
    (a, b) => (a.context.screen_total_min ?? 0) - (b.context.screen_total_min ?? 0)
  );
  const split = Math.max(1, Math.floor(sorted.length / 2));
  const low = sorted.slice(0, split);
  const high = sorted.slice(-split);

  const avgStress = (items: typeof paired) =>
    items.reduce((sum, item) => sum + item.mood.stress, 0) / items.length;
  const avgMood = (items: typeof paired) =>
    items.reduce((sum, item) => sum + item.mood.mood, 0) / items.length;

  const highStressDelta = avgStress(high) - avgStress(low);
  const highMoodDelta = avgMood(high) - avgMood(low);

  if (highStressDelta >= 0.75) {
    return "Les jours les plus connectés semblent parfois aller avec un stress plus haut. À observer sur plus de jours.";
  }
  if (highMoodDelta <= -0.75) {
    return "Les jours les plus connectés semblent parfois aller avec une humeur plus basse. Ce n'est pas une cause, juste un repère.";
  }

  return "Pour l'instant, le temps d'écran ne montre pas de signal net avec l'humeur ou le stress.";
}
