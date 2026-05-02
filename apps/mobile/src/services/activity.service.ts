import { Platform } from "react-native";
import type { ActivityData, ActivityLevel } from "@/types/contextual";
import { isExpoGo } from "@/utils/runtime";

function activityLevelFromSteps(steps: number): ActivityLevel {
  if (steps >= 10000) return 'active';
  if (steps >= 7000) return 'moderate';
  if (steps >= 3000) return 'light';
  return 'sedentary';
}

function dayWindow(dateISO: string): { start: Date; end: Date } {
  const start = new Date(dateISO + 'T00:00:00');
  const end = new Date(dateISO + 'T23:59:59');
  return { start, end };
}

export const activityService = {
  async requestPermission(): Promise<boolean> {
    if (isExpoGo()) return false;

    try {
      if (Platform.OS === 'ios') {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const HK = require('@kingstinct/react-native-healthkit');
        await HK.default.requestAuthorization(
          [],
          [
            HK.HKQuantityTypeIdentifier.stepCount,
            HK.HKQuantityTypeIdentifier.activeEnergyBurned,
            HK.HKQuantityTypeIdentifier.appleExerciseTime,
          ]
        );
        return true;
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
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const HK = require('@kingstinct/react-native-healthkit');

        const [stepStats, exerciseStats] = await Promise.all([
          HK.default.queryStatisticsForQuantity(
            HK.HKQuantityTypeIdentifier.stepCount,
            ['cumulativeSum'],
            start,
            end
          ),
          HK.default.queryStatisticsForQuantity(
            HK.HKQuantityTypeIdentifier.appleExerciseTime,
            ['cumulativeSum'],
            start,
            end
          ),
        ]);

        const steps = Math.round(stepStats?.cumulativeSum?.quantity ?? 0);
        const trainingMin = Math.round(exerciseStats?.cumulativeSum?.quantity ?? 0);

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
