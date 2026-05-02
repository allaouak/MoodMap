import { buildScreenTimeObservation, formatHoursFromMinutes } from "../utils/contextual";
import type { MoodEntry } from "../types";
import type { ContextualEntry } from "../types/contextual";

function mood(entry_date: string, stress: number, moodValue = 3): MoodEntry {
  return {
    id: `mood-${entry_date}`,
    user_id: "user-1",
    mood: moodValue as MoodEntry["mood"],
    energy: 3,
    stress: stress as MoodEntry["stress"],
    note: null,
    tags: [],
    entry_date,
    created_at: `${entry_date}T10:00:00.000Z`,
    updated_at: `${entry_date}T10:00:00.000Z`,
  };
}

function context(entry_date: string, screen_total_min: number): ContextualEntry {
  return {
    id: `context-${entry_date}`,
    user_id: "user-1",
    entry_date,
    sleep_duration_min: null,
    sleep_bedtime: null,
    sleep_wake_time: null,
    sleep_quality: null,
    sleep_source: null,
    activity_steps: null,
    activity_active_min: null,
    activity_training_min: null,
    activity_level: null,
    activity_source: null,
    screen_total_min,
    screen_source: "manual",
    created_at: `${entry_date}T10:00:00.000Z`,
    updated_at: `${entry_date}T10:00:00.000Z`,
  };
}

describe("formatHoursFromMinutes", () => {
  it("formate les minutes en heures lisibles", () => {
    expect(formatHoursFromMinutes(210)).toBe("3.5 h");
    expect(formatHoursFromMinutes(792)).toBe("13 h");
  });
});

describe("buildScreenTimeObservation", () => {
  it("attend au moins trois jours appariés", () => {
    expect(
      buildScreenTimeObservation(
        [mood("2026-05-01", 2), mood("2026-05-02", 4)],
        [context("2026-05-01", 60), context("2026-05-02", 300)]
      )
    ).toBeNull();
  });

  it("signale prudemment un stress plus haut les jours très connectés", () => {
    const observation = buildScreenTimeObservation(
      [
        mood("2026-05-01", 1),
        mood("2026-05-02", 2),
        mood("2026-05-03", 4),
        mood("2026-05-04", 5),
      ],
      [
        context("2026-05-01", 60),
        context("2026-05-02", 120),
        context("2026-05-03", 480),
        context("2026-05-04", 600),
      ]
    );

    expect(observation).toContain("stress plus haut");
  });
});
