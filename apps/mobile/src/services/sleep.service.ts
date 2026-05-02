import { Platform } from "react-native";
import type { SleepData } from "@/types/contextual";
import { isExpoGo } from "@/utils/runtime";

function sleepQualityFromMinutes(min: number): 1 | 2 | 3 | 4 | 5 {
  if (min >= 450) return 5;
  if (min >= 360) return 4;
  if (min >= 300) return 3;
  if (min >= 240) return 2;
  return 1;
}

function toHHMM(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// Fenêtre de recherche du sommeil : veille 18h → jour J 12h
function sleepWindow(dateISO: string): { start: Date; end: Date } {
  const target = new Date(dateISO + 'T00:00:00');
  const start = new Date(target);
  start.setDate(start.getDate() - 1);
  start.setHours(18, 0, 0, 0);
  const end = new Date(target);
  end.setHours(12, 0, 0, 0);
  return { start, end };
}

export const sleepService = {
  async requestPermission(): Promise<boolean> {
    if (isExpoGo()) return false;

    try {
      if (Platform.OS === 'ios') {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const HK = require('@kingstinct/react-native-healthkit');
        await HK.default.requestAuthorization(
          [],
          [HK.HKCategoryTypeIdentifier.sleepAnalysis]
        );
        return true;
      }
      if (Platform.OS === 'android') {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const HC = require('react-native-health-connect');
        await HC.initialize();
        const result = await HC.requestPermission([
          { accessType: 'read', recordType: 'SleepSession' },
        ]);
        return result.some((r: { granted: boolean }) => r.granted);
      }
      return false;
    } catch {
      return false;
    }
  },

  async fetchForDate(dateISO: string): Promise<SleepData | null> {
    if (isExpoGo()) return null;

    try {
      const { start, end } = sleepWindow(dateISO);

      if (Platform.OS === 'ios') {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const HK = require('@kingstinct/react-native-healthkit');
        const samples: Array<{ startDate: string; endDate: string; value: number }> =
          await HK.default.queryCategorySamples(
            HK.HKCategoryTypeIdentifier.sleepAnalysis,
            { from: start, to: end }
          );

        // value 1 = AsleepUnspecified, 3 = AsleepCore, 4 = AsleepDeep, 5 = AsleepREM
        const asleepSamples = samples.filter((s) => s.value !== 0 && s.value !== 2);
        if (asleepSamples.length === 0) return null;

        const totalMs = asleepSamples.reduce((acc, s) => {
          return acc + (new Date(s.endDate).getTime() - new Date(s.startDate).getTime());
        }, 0);

        const durationMin = Math.round(totalMs / 60000);
        const bedtime = new Date(Math.min(...asleepSamples.map((s) => new Date(s.startDate).getTime())));
        const wakeTime = new Date(Math.max(...asleepSamples.map((s) => new Date(s.endDate).getTime())));

        return {
          duration_min: durationMin,
          bedtime: toHHMM(bedtime),
          wake_time: toHHMM(wakeTime),
          quality: sleepQualityFromMinutes(durationMin),
          source: 'healthkit',
        };
      }

      if (Platform.OS === 'android') {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const HC = require('react-native-health-connect');
        const { records } = await HC.readRecords('SleepSession', {
          timeRangeFilter: {
            operator: 'between',
            startTime: start.toISOString(),
            endTime: end.toISOString(),
          },
        });

        if (!records || records.length === 0) return null;

        const session = records[0];
        const sessionStart = new Date(session.startTime);
        const sessionEnd = new Date(session.endTime);

        // Durée des stages Asleep uniquement (stage 4/5/6 = light/deep/REM)
        const asleepMs = (session.stages ?? [])
          .filter((st: { stage: number }) => st.stage >= 4)
          .reduce((acc: number, st: { startTime: string; endTime: string }) => {
            return acc + (new Date(st.endTime).getTime() - new Date(st.startTime).getTime());
          }, 0);

        const durationMin = asleepMs > 0
          ? Math.round(asleepMs / 60000)
          : Math.round((sessionEnd.getTime() - sessionStart.getTime()) / 60000);

        return {
          duration_min: durationMin,
          bedtime: toHHMM(sessionStart),
          wake_time: toHHMM(sessionEnd),
          quality: sleepQualityFromMinutes(durationMin),
          source: 'health_connect',
        };
      }

      return null;
    } catch {
      return null;
    }
  },
};
