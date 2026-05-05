import { Platform } from "react-native";
import type { ActivityData, ActivityLevel } from "@/types/contextual";
import { isExpoGo } from "@/utils/runtime";

const HK_STEP_COUNT_IDENTIFIER = "HKQuantityTypeIdentifierStepCount";
const HK_EXERCISE_TIME_IDENTIFIER = "HKQuantityTypeIdentifierAppleExerciseTime";

interface HealthKitQuantityStats {
  sumQuantity?: { quantity: number; unit: string };
}

interface HealthKitActivityModule {
  isHealthDataAvailableAsync?: () => Promise<boolean>;
  isHealthDataAvailable?: () => boolean;
  requestAuthorization: (request: { toRead: readonly string[] }) => Promise<boolean>;
  queryStatisticsForQuantity: (
    identifier: typeof HK_STEP_COUNT_IDENTIFIER | typeof HK_EXERCISE_TIME_IDENTIFIER,
    statistics: readonly ["cumulativeSum"],
    options: { filter: { date: { startDate: Date; endDate: Date } }; unit?: string }
  ) => Promise<HealthKitQuantityStats>;
}

export function activityLevelFromSteps(steps: number): ActivityLevel {
  if (steps >= 10000) return 'active';
  if (steps >= 7000) return 'moderate';
  if (steps >= 3000) return 'light';
  return 'sedentary';
}

export function dayWindow(dateISO: string): { start: Date; end: Date } {
  const start = new Date(dateISO + 'T00:00:00');
  const end = new Date(dateISO + 'T23:59:59');
  return { start, end };
}

async function loadHealthKit(): Promise<HealthKitActivityModule> {
  const mod = await import("@kingstinct/react-native-healthkit");
  return mod as unknown as HealthKitActivityModule;
}

export const activityService = {
  async requestPermission(): Promise<boolean> {
    if (isExpoGo()) return false;

    try {
      if (Platform.OS === 'ios') {
        const HK = await loadHealthKit();
        const available = HK.isHealthDataAvailableAsync
          ? await HK.isHealthDataAvailableAsync()
          : HK.isHealthDataAvailable?.() ?? false;
        if (!available) return false;

        return HK.requestAuthorization({
          toRead: [HK_STEP_COUNT_IDENTIFIER, HK_EXERCISE_TIME_IDENTIFIER],
        });
      }
      if (Platform.OS === 'android') {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const HC = require('react-native-health-connect');
        await HC.initialize();
        const result = await HC.requestPermission([
          { accessType: 'read', recordType: 'Steps' },
          { accessType: 'read', recordType: 'ExerciseSession' },
        ]);
        return result.some((r: { granted: boolean }) => r.granted);
      }
      return false;
    } catch {
      return false;
    }
  },

  async fetchForDate(dateISO: string): Promise<ActivityData | null> {
    if (isExpoGo()) return null;

    try {
      const { start, end } = dayWindow(dateISO);

      if (Platform.OS === 'ios') {
        const HK = await loadHealthKit();
        const dateFilter = { date: { startDate: start, endDate: end } };

        const [stepStats, exerciseStats] = await Promise.all([
          HK.queryStatisticsForQuantity(
            HK_STEP_COUNT_IDENTIFIER,
            ["cumulativeSum"],
            { filter: dateFilter, unit: "count" }
          ),
          HK.queryStatisticsForQuantity(
            HK_EXERCISE_TIME_IDENTIFIER,
            ["cumulativeSum"],
            { filter: dateFilter, unit: "min" }
          ),
        ]);

        const steps = Math.round(stepStats?.sumQuantity?.quantity ?? 0);
        const trainingMin = Math.round(exerciseStats?.sumQuantity?.quantity ?? 0);

        if (steps === 0 && trainingMin === 0) return null;

        // active_min = estimation basée sur les pas (1 pas ≈ 0.01 min d'activité modérée)
        const activeMin = Math.round(steps * 0.01);

        return {
          steps,
          active_min: activeMin,
          training_min: trainingMin,
          level: activityLevelFromSteps(steps),
          source: 'healthkit',
        };
      }

      if (Platform.OS === 'android') {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const HC = require('react-native-health-connect');

        const [stepsResult, exerciseResult] = await Promise.all([
          HC.aggregateRecord({
            recordType: 'Steps',
            timeRangeFilter: {
              operator: 'between',
              startTime: start.toISOString(),
              endTime: end.toISOString(),
            },
          }),
          HC.readRecords('ExerciseSession', {
            timeRangeFilter: {
              operator: 'between',
              startTime: start.toISOString(),
              endTime: end.toISOString(),
            },
          }),
        ]);

        const steps = stepsResult?.COUNT ?? 0;
        if (steps === 0) return null;

        const trainingMin = (exerciseResult?.records ?? []).reduce(
          (acc: number, r: { startTime: string; endTime: string }) =>
            acc + Math.round((new Date(r.endTime).getTime() - new Date(r.startTime).getTime()) / 60000),
          0
        );
        const activeMin = Math.round(steps * 0.01);

        return {
          steps,
          active_min: activeMin,
          training_min: trainingMin,
          level: activityLevelFromSteps(steps),
          source: 'health_connect',
        };
      }

      return null;
    } catch {
      return null;
    }
  },
};
