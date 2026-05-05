import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { format, subDays } from "date-fns";
import { useQueries } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth.store";
import { moodService } from "@/services/mood.service";
import { contextualEntryService } from "@/services/contextual-entry.service";
import { MoodEntry, MoodLevel, MOOD_COLOR, MOOD_LABELS } from "@/types";
import type { ContextualEntry } from "@/types/contextual";
import { buildContextualObservations } from "@/utils/contextual";
import { MoodFaceIcon } from "@/components/mood/MoodFaceIcon";
import { AppIcon } from "@/components/ui/AppIcon";
import { MoodBarChart } from "@/features/insights/MoodBarChart";
import { MoodStatsRow } from "@/features/insights/MoodStatsRow";
import { TagCloud } from "@/features/insights/TagCloud";
import { ContextualSummaryCard, type ContextualStats } from "@/features/insights/ContextualSummaryCard";

interface Stats {
  avgMood: number;
  avgEnergy: number;
  avgStress: number;
  topTags: { tag: string; count: number }[];
  entries: MoodEntry[];
}

function computeStats(entries: MoodEntry[]): Stats {
  if (entries.length === 0) {
    return { avgMood: 0, avgEnergy: 0, avgStress: 0, topTags: [], entries };
  }
  const sum = entries.reduce(
    (acc, e) => ({ mood: acc.mood + e.mood, energy: acc.energy + e.energy, stress: acc.stress + e.stress }),
    { mood: 0, energy: 0, stress: 0 }
  );
  const n = entries.length;
  const tagCounts: Record<string, number> = {};
  entries.forEach((e) => e.tags.forEach((t) => (tagCounts[t] = (tagCounts[t] ?? 0) + 1)));
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([tag, count]) => ({ tag, count }));
  return { avgMood: sum.mood / n, avgEnergy: sum.energy / n, avgStress: sum.stress / n, topTags, entries };
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function computeContextualStats(entries: ContextualEntry[]): ContextualStats {
  const sleepValues = entries.map((e) => e.sleep_duration_min).filter((v): v is number => v != null);
  const stepValues = entries.map((e) => e.activity_steps).filter((v): v is number => v != null);
  const screenValues = entries.map((e) => e.screen_total_min).filter((v): v is number => v != null);
  const sleepAvg = avg(sleepValues);
  const stepsAvg = avg(stepValues);
  const screenAvg = avg(screenValues);
  return {
    sleepAvgHours: sleepAvg == null ? null : sleepAvg / 60,
    sleepCount: sleepValues.length,
    sleepTotal: entries.length,
    stepsAvg,
    activityCount: stepValues.length,
    activityTotal: entries.length,
    screenAvgHours: screenAvg == null ? null : screenAvg / 60,
    screenCount: screenValues.length,
    screenTotal: entries.length,
  };
}

function moodLevelFor(average: number): MoodLevel {
  return Math.round(Math.max(1, Math.min(5, average))) as MoodLevel;
}

export default function InsightsScreen() {
  const { user } = useAuthStore();
  const userId = user?.id;
  const today = format(new Date(), "yyyy-MM-dd");
  const from7 = format(subDays(new Date(), 6), "yyyy-MM-dd");
  const from30 = format(subDays(new Date(), 29), "yyyy-MM-dd");

  const results = useQueries({
    queries: [
      {
        queryKey: ["moodEntries", userId, "7days", from7, today],
        queryFn: () => {
          if (!userId) throw new Error("User not authenticated");
          return moodService.getEntries(userId, from7, today);
        },
        enabled: !!userId,
        staleTime: 1000 * 60 * 5,
      },
      {
        queryKey: ["moodEntries", userId, "30days", from30, today],
        queryFn: () => {
          if (!userId) throw new Error("User not authenticated");
          return moodService.getEntries(userId, from30, today);
        },
        enabled: !!userId,
        staleTime: 1000 * 60 * 5,
      },
      {
        queryKey: ["contextualEntries", userId, "7days", from7, today],
        queryFn: () => {
          if (!userId) throw new Error("User not authenticated");
          return contextualEntryService.getForDateRange(userId, from7, today);
        },
        enabled: !!userId,
        staleTime: 1000 * 60 * 5,
      },
      {
        queryKey: ["contextualEntries", userId, "30days", from30, today],
        queryFn: () => {
          if (!userId) throw new Error("User not authenticated");
          return contextualEntryService.getForDateRange(userId, from30, today);
        },
        enabled: !!userId,
        staleTime: 1000 * 60 * 5,
      },
    ],
  });

  const mood7 = results[0].data ?? [];
  const mood30 = results[1].data ?? [];
  const contextual7Data = results[2].data ?? [];
  const contextual30Data = results[3].data ?? [];
  const loading = results.some((r) => r.isLoading);
  const error = results.some((r) => r.isError)
    ? "Impossible de charger les tendances. Vérifie ta connexion."
    : null;

  const stats7 = computeStats(mood7);
  const stats30 = computeStats(mood30);
  const contextual7 = computeContextualStats(contextual7Data);
  const contextual30 = computeContextualStats(contextual30Data);
  const observations = buildContextualObservations(mood30, contextual30Data);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]} testID="insights-container">
        <View style={styles.loader}>
          <ActivityIndicator color="#6D28D9" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]} testID="insights-container">
        <View style={styles.loader}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasData = stats7.entries.length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]} testID="insights-container">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Tendances</Text>

        {!hasData ? (
          <View style={styles.emptyState}>
            <AppIcon name="chart-line" color="#6D28D9" backgroundColor="#F3E8FF" size={30} frameSize={60} />
            <Text style={styles.emptyTitle}>Tes tendances arrivent</Text>
            <Text style={styles.emptySubtitle}>
              Reviens après quelques jours de check-ins. Tes premières courbes apparaîtront après 3 entrées.
            </Text>
          </View>
        ) : (
          <>
            {stats7.entries.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>7 derniers jours</Text>
                <Text style={styles.cardSubtitle}>Humeur quotidienne, de 1 à 5</Text>
                <MoodBarChart entries={stats7.entries} />
                <MoodStatsRow
                  avgMood={stats7.avgMood}
                  avgEnergy={stats7.avgEnergy}
                  avgStress={stats7.avgStress}
                />
              </View>
            )}

            {stats30.entries.length >= 3 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>30 derniers jours</Text>
                <Text style={styles.cardSubtitle}>
                  {stats30.entries.length} entrée{stats30.entries.length > 1 ? "s" : ""}
                </Text>
                <MoodStatsRow
                  avgMood={stats30.avgMood}
                  avgEnergy={stats30.avgEnergy}
                  avgStress={stats30.avgStress}
                />
              </View>
            )}

            {stats30.topTags.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Contextes fréquents</Text>
                <Text style={styles.cardSubtitle}>Sur les 30 derniers jours</Text>
                <TagCloud topTags={stats30.topTags} />
              </View>
            )}

            <ContextualSummaryCard
              contextual7={contextual7}
              contextual30={contextual30}
              observations={observations}
            />

            {stats30.entries.length > 0 && (
              <View
                style={[
                  styles.moodSummary,
                  { borderColor: MOOD_COLOR[moodLevelFor(stats30.avgMood)] + "40" },
                ]}
              >
                <MoodFaceIcon level={moodLevelFor(stats30.avgMood)} size={40} />
                <Text style={styles.moodSummaryText}>
                  En moyenne, tu te sens{" "}
                  <Text
                    style={{
                      fontWeight: "700",
                      color: MOOD_COLOR[moodLevelFor(stats30.avgMood)],
                    }}
                  >
                    {MOOD_LABELS[moodLevelFor(stats30.avgMood)].toLowerCase()}
                  </Text>{" "}
                  sur le dernier mois.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8F4FF" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40, gap: 16 },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  pageTitle: { fontSize: 28, lineHeight: 34, fontWeight: "700", color: "#1F2937", paddingHorizontal: 4 },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#1F2937", textAlign: "center" },
  emptySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 21,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    gap: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#1F2937" },
  cardSubtitle: { fontSize: 13, lineHeight: 19, color: "#9CA3AF", marginTop: -8 },
  moodSummary: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1.5,
  },
  moodSummaryText: { flex: 1, fontSize: 14, color: "#374151", lineHeight: 20 },
  errorText: { fontSize: 14, color: "#EF4444", textAlign: "center", paddingHorizontal: 16 },
});
