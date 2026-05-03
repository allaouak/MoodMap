import type { ContextualEntry } from "@/types/contextual";
import type { MoodEntry } from "@/types";

export type ContextualObservation = {
  module: "sleep" | "activity" | "screen_time";
  text: string;
};

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

function pairedByMetric(
  moodEntries: MoodEntry[],
  contextualEntries: ContextualEntry[],
  getMetric: (entry: ContextualEntry) => number | null
) {
  const moodByDate = new Map(moodEntries.map((entry) => [entry.entry_date, entry]));
  return contextualEntries
    .map((context) => ({
      metric: getMetric(context),
      mood: moodByDate.get(context.entry_date),
    }))
    .filter((item): item is { metric: number; mood: MoodEntry } =>
      item.mood != null && item.metric != null
    );
}

function compareLowHigh<T extends { metric: number; mood: MoodEntry }>(paired: T[]) {
  const sorted = [...paired].sort((a, b) => a.metric - b.metric);
  const split = Math.max(1, Math.floor(sorted.length / 2));
  const low = sorted.slice(0, split);
  const high = sorted.slice(-split);
  const avg = (items: T[], getValue: (item: T) => number) =>
    items.reduce((sum, item) => sum + getValue(item), 0) / items.length;

  return {
    moodDelta: avg(high, (item) => item.mood.mood) - avg(low, (item) => item.mood.mood),
    energyDelta: avg(high, (item) => item.mood.energy) - avg(low, (item) => item.mood.energy),
    stressDelta: avg(high, (item) => item.mood.stress) - avg(low, (item) => item.mood.stress),
  };
}

export function buildScreenTimeObservation(
  moodEntries: MoodEntry[],
  contextualEntries: ContextualEntry[]
): string | null {
  const paired = pairedByMetric(
    moodEntries,
    contextualEntries,
    (entry) => entry.screen_total_min
  );

  if (paired.length < 3) {
    return null;
  }

  const { stressDelta, moodDelta } = compareLowHigh(paired);

  if (stressDelta >= 0.75) {
    return "Les jours les plus connectés semblent parfois aller avec un stress plus haut. À observer sur plus de jours.";
  }
  if (moodDelta <= -0.75) {
    return "Les jours les plus connectés semblent parfois aller avec une humeur plus basse. Ce n'est pas une cause, juste un repère.";
  }

  return "Pour l'instant, le temps d'écran ne montre pas de signal net avec l'humeur ou le stress.";
}

export function buildContextualObservations(
  moodEntries: MoodEntry[],
  contextualEntries: ContextualEntry[]
): ContextualObservation[] {
  const observations: ContextualObservation[] = [];

  const sleepPairs = pairedByMetric(
    moodEntries,
    contextualEntries,
    (entry) => entry.sleep_duration_min
  );
  if (sleepPairs.length >= 3) {
    const { moodDelta, stressDelta } = compareLowHigh(sleepPairs);
    if (moodDelta >= 0.6) {
      observations.push({
        module: "sleep",
        text: "Les nuits plus longues semblent aller avec une humeur un peu meilleure sur cette période.",
      });
    } else if (stressDelta <= -0.6) {
      observations.push({
        module: "sleep",
        text: "Les nuits plus longues semblent aller avec un stress plus bas. C'est un signal à confirmer avec plus de jours.",
      });
    }
  }

  const activityPairs = pairedByMetric(
    moodEntries,
    contextualEntries,
    (entry) => entry.activity_steps
  );
  if (activityPairs.length >= 3) {
    const { moodDelta, energyDelta, stressDelta } = compareLowHigh(activityPairs);
    if (energyDelta >= 0.6) {
      observations.push({
        module: "activity",
        text: "Les jours avec plus de pas semblent aller avec plus d'énergie.",
      });
    } else if (moodDelta >= 0.6) {
      observations.push({
        module: "activity",
        text: "Les jours plus actifs semblent aller avec une humeur un peu plus haute.",
      });
    } else if (stressDelta <= -0.6) {
      observations.push({
        module: "activity",
        text: "Les jours plus actifs semblent aller avec un stress plus bas.",
      });
    }
  }

  const screenObservation = buildScreenTimeObservation(moodEntries, contextualEntries);
  if (screenObservation) {
    observations.push({
      module: "screen_time",
      text: screenObservation,
    });
  }

  return observations;
}
