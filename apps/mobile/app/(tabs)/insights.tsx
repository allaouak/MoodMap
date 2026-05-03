import { useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { format, subDays, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuthStore } from "@/stores/auth.store";
import { moodService } from "@/services/mood.service";
import { contextualEntryService } from "@/services/contextual-entry.service";
import { MoodEntry, MoodLevel, MOOD_COLOR, MOOD_LABELS } from "@/types";
import type { ContextualEntry } from "@/types/contextual";
import { buildContextualObservations, type ContextualObservation } from "@/utils/contextual";
import { MoodFaceIcon } from "@/components/mood/MoodFaceIcon";
import { AppIcon } from "@/components/ui/AppIcon";

interface Stats {
  avgMood: number;
  avgEnergy: number;
  avgStress: number;
  topTags: { tag: string; count: number }[];
  entries: MoodEntry[];
}

interface ContextualStats {
  sleepAvgHours: number | null;
  sleepCount: number;
  sleepTotal: number;
  stepsAvg: number | null;
  activityCount: number;
  activityTotal: number;
  screenAvgHours: number | null;
  screenCount: number;
  screenTotal: number;
}

function computeStats(entries: MoodEntry[]): Stats {
  if (entries.length === 0) {
    return { avgMood: 0, avgEnergy: 0, avgStress: 0, topTags: [], entries };
  }
  const sum = entries.reduce(
    (acc, e) => ({
      mood: acc.mood + e.mood,
      energy: acc.energy + e.energy,
      stress: acc.stress + e.stress,
    }),
    { mood: 0, energy: 0, stress: 0 }
  );
  const n = entries.length;

  const tagCounts: Record<string, number> = {};
  entries.forEach((e) => e.tags.forEach((t) => (tagCounts[t] = (tagCounts[t] ?? 0) + 1)));
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([tag, count]) => ({ tag, count }));

  return {
    avgMood: sum.mood / n,
    avgEnergy: sum.energy / n,
    avgStress: sum.stress / n,
    topTags,
    entries,
  };
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function computeContextualStats(entries: ContextualEntry[]): ContextualStats {
  const sleepValues = entries
    .map((entry) => entry.sleep_duration_min)
    .filter((value): value is number => value != null);
  const stepValues = entries
    .map((entry) => entry.activity_steps)
    .filter((value): value is number => value != null);
  const screenValues = entries
    .map((entry) => entry.screen_total_min)
    .filter((value): value is number => value != null);

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

function moodLevelFor(avg: number): MoodLevel {
  return (Math.round(Math.max(1, Math.min(5, avg))) as MoodLevel);
}

function StatCard({
  label,
  avg,
  color,
  icon,
}: {
  label: string;
  avg: number;
  color: string;
  icon: ReactNode;
}) {
  const pct = ((avg - 1) / 4) * 100;
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        {typeof icon === "string" ? <Text style={styles.statEmoji}>{icon}</Text> : icon}
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{avg > 0 ? avg.toFixed(1) : "—"}</Text>
      {avg > 0 && (
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${pct}%` as `${number}%`, backgroundColor: color }]} />
        </View>
      )}
    </View>
  );
}

function MiniBar({ entry }: { entry: MoodEntry }) {
  const color = MOOD_COLOR[entry.mood];
  const height = (entry.mood / 5) * 40 + 4;
  const date = parseISO(entry.entry_date);
  return (
    <View style={styles.miniBarCol}>
      <View style={styles.miniBarTrack}>
        <View style={[styles.miniBarFill, { height, backgroundColor: color }]}>
          <Text style={styles.miniBarValue}>{entry.mood}</Text>
        </View>
      </View>
      <Text style={styles.miniBarDate}>{format(date, "dd", { locale: fr })}</Text>
      <Text style={styles.miniBarMood}>{MOOD_LABELS[entry.mood]}</Text>
    </View>
  );
}

function ObservationItem({ observation }: { observation: ContextualObservation }) {
  const icon =
    observation.module === "sleep"
      ? "moon-waning-crescent"
      : observation.module === "activity"
        ? "shoe-sneaker"
        : "cellphone";
  const color =
    observation.module === "sleep"
      ? "#6366F1"
      : observation.module === "activity"
        ? "#059669"
        : "#0284C7";
  const backgroundColor =
    observation.module === "sleep"
      ? "#EEF2FF"
      : observation.module === "activity"
        ? "#ECFDF5"
        : "#E0F2FE";

  return (
    <View style={styles.observationBox}>
      <AppIcon
        name={icon}
        color={color}
        backgroundColor={backgroundColor}
        size={16}
        frameSize={30}
      />
      <Text style={styles.observationText}>{observation.text}</Text>
    </View>
  );
}

export default function InsightsScreen() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats7, setStats7] = useState<Stats | null>(null);
  const [stats30, setStats30] = useState<Stats | null>(null);
  const [contextual7, setContextual7] = useState<ContextualStats | null>(null);
  const [contextual30, setContextual30] = useState<ContextualStats | null>(null);
  const [contextualObservations, setContextualObservations] = useState<ContextualObservation[]>([]);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const from7 = format(subDays(new Date(), 6), "yyyy-MM-dd");
      const from30 = format(subDays(new Date(), 29), "yyyy-MM-dd");

      const [e7, e30, c7, c30] = await Promise.all([
        moodService.getEntries(user.id, from7, today),
        moodService.getEntries(user.id, from30, today),
        contextualEntryService.getForDateRange(user.id, from7, today),
        contextualEntryService.getForDateRange(user.id, from30, today),
      ]);

      if (mountedRef.current) {
        setStats7(computeStats(e7));
        setStats30(computeStats(e30));
        setContextual7(computeContextualStats(c7));
        setContextual30(computeContextualStats(c30));
        setContextualObservations(buildContextualObservations(e30, c30));
      }
    } catch {
      if (mountedRef.current) setError("Impossible de charger les tendances. Vérifie ta connexion.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => { mountedRef.current = false; };
  }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.loader}>
          <ActivityIndicator color="#6D28D9" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.loader}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasData = (stats7?.entries.length ?? 0) > 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Tendances</Text>

        {!hasData ? (
          <View style={styles.emptyState}>
            <AppIcon name="chart-line" size={30} frameSize={60} />
            <Text style={styles.emptyTitle}>Pas encore assez de données</Text>
            <Text style={styles.emptySubtitle}>
              Fais quelques check-ins quotidiens pour voir tes tendances apparaître ici.
            </Text>
          </View>
        ) : (
          <>
            {/* Graphique 7 derniers jours */}
            {stats7 && stats7.entries.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>7 derniers jours</Text>
                <Text style={styles.cardSubtitle}>Humeur quotidienne, de 1 à 5</Text>
                <View style={styles.miniBarChart}>
                  {[...stats7.entries].reverse().map((e) => (
                    <MiniBar key={e.id} entry={e} />
                  ))}
                </View>
                <View style={styles.statRow}>
                  <StatCard
                    label="Humeur"
                    avg={stats7.avgMood}
                    color={MOOD_COLOR[moodLevelFor(stats7.avgMood)]}
                    icon={<MoodFaceIcon level={moodLevelFor(stats7.avgMood)} size={26} />}
                  />
                  <StatCard
                    label="Énergie"
                    avg={stats7.avgEnergy}
                    color="#60A5FA"
                    icon={
                      <AppIcon
                        name="flash-outline"
                        color="#60A5FA"
                        backgroundColor="#EFF6FF"
                        size={17}
                        frameSize={30}
                      />
                    }
                  />
                  <StatCard
                    label="Stress"
                    avg={stats7.avgStress}
                    color="#F97316"
                    icon={
                      <AppIcon
                        name="thermometer"
                        color="#F97316"
                        backgroundColor="#FFF7ED"
                        size={17}
                        frameSize={30}
                      />
                    }
                  />
                </View>
              </View>
            )}

            {/* Stats 30 jours */}
            {stats30 && stats30.entries.length >= 3 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>30 derniers jours</Text>
                <Text style={styles.cardSubtitle}>
                  {stats30.entries.length} entrée{stats30.entries.length > 1 ? "s" : ""}
                </Text>
                <View style={styles.statRow}>
                  <StatCard
                    label="Humeur"
                    avg={stats30.avgMood}
                    color={MOOD_COLOR[moodLevelFor(stats30.avgMood)]}
                    icon={<MoodFaceIcon level={moodLevelFor(stats30.avgMood)} size={26} />}
                  />
                  <StatCard
                    label="Énergie"
                    avg={stats30.avgEnergy}
                    color="#60A5FA"
                    icon={
                      <AppIcon
                        name="flash-outline"
                        color="#60A5FA"
                        backgroundColor="#EFF6FF"
                        size={17}
                        frameSize={30}
                      />
                    }
                  />
                  <StatCard
                    label="Stress"
                    avg={stats30.avgStress}
                    color="#F97316"
                    icon={
                      <AppIcon
                        name="thermometer"
                        color="#F97316"
                        backgroundColor="#FFF7ED"
                        size={17}
                        frameSize={30}
                      />
                    }
                  />
                </View>
              </View>
            )}

            {/* Tags fréquents */}
            {stats30 && stats30.topTags.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Contextes fréquents</Text>
                <Text style={styles.cardSubtitle}>Sur les 30 derniers jours</Text>
                <View style={styles.tagCloud}>
                  {stats30.topTags.map(({ tag, count }, i) => (
                    <View
                      key={tag}
                      style={[
                        styles.tagChip,
                        i === 0 && styles.tagChipTop,
                      ]}
                    >
                      <Text style={[styles.tagChipText, i === 0 && styles.tagChipTextTop]}>
                        {tag}
                      </Text>
                      <Text style={[styles.tagChipCount, i === 0 && styles.tagChipCountTop]}>
                        ×{count}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Données contextuelles */}
            {contextual30 && (
              contextual30.sleepCount > 0 ||
              contextual30.activityCount > 0 ||
              contextual30.screenCount > 0
            ) && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Rythmes du quotidien</Text>
                <Text style={styles.cardSubtitle}>Moyennes sur les données disponibles</Text>
                <View style={styles.contextGrid}>
                  {contextual7?.sleepAvgHours != null && (
                    <View style={styles.contextItem}>
                      <AppIcon
                        name="moon-waning-crescent"
                        color="#6366F1"
                        backgroundColor="#EEF2FF"
                        size={18}
                        frameSize={34}
                      />
                      <Text style={styles.contextLabel}>Sommeil 7j</Text>
                      <Text style={styles.contextValue}>
                        {contextual7.sleepAvgHours.toFixed(1)} h
                      </Text>
                      <Text style={styles.contextMeta}>
                        {contextual7.sleepCount}/{contextual7.sleepTotal} jour{contextual7.sleepTotal > 1 ? "s" : ""}
                      </Text>
                    </View>
                  )}
                  {contextual30.stepsAvg != null && (
                    <View style={styles.contextItem}>
                      <AppIcon
                        name="shoe-sneaker"
                        color="#059669"
                        backgroundColor="#ECFDF5"
                        size={18}
                        frameSize={34}
                      />
                      <Text style={styles.contextLabel}>Pas 30j</Text>
                      <Text style={styles.contextValue}>
                        {Math.round(contextual30.stepsAvg).toLocaleString("fr-FR")}
                      </Text>
                      <Text style={styles.contextMeta}>
                        {contextual30.activityCount}/{contextual30.activityTotal} jour{contextual30.activityTotal > 1 ? "s" : ""}
                      </Text>
                    </View>
                  )}
                  {contextual30.screenAvgHours != null && (
                    <View style={styles.contextItem}>
                      <AppIcon
                        name="cellphone"
                        color="#0284C7"
                        backgroundColor="#E0F2FE"
                        size={18}
                        frameSize={34}
                      />
                      <Text style={styles.contextLabel}>Écran 30j</Text>
                      <Text style={styles.contextValue}>
                        {contextual30.screenAvgHours.toFixed(1)} h
                      </Text>
                      <Text style={styles.contextMeta}>
                        {contextual30.screenCount}/{contextual30.screenTotal} jour{contextual30.screenTotal > 1 ? "s" : ""}
                      </Text>
                    </View>
                  )}
                </View>
                {contextualObservations.length > 0 && (
                  <View style={styles.observationList}>
                    {contextualObservations.map((observation) => (
                      <ObservationItem
                        key={`${observation.module}-${observation.text}`}
                        observation={observation}
                      />
                    ))}
                  </View>
                )}
                <Text style={styles.contextHint}>
                  Ces repères restent descriptifs : ils aident à observer tes rythmes sans conclure à une cause.
                </Text>
              </View>
            )}

            {/* Message d'humeur globale */}
            {stats30 && stats30.entries.length > 0 && (
              <View style={[styles.moodSummary, { borderColor: MOOD_COLOR[moodLevelFor(stats30.avgMood)] + "40" }]}>
                <MoodFaceIcon level={moodLevelFor(stats30.avgMood)} size={40} />
                <Text style={styles.moodSummaryText}>
                  En moyenne, tu te sens{" "}
                  <Text style={{ fontWeight: "700", color: MOOD_COLOR[moodLevelFor(stats30.avgMood)] }}>
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

  miniBarChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    minHeight: 82,
    paddingTop: 4,
  },
  miniBarCol: { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 3 },
  miniBarTrack: {
    width: "100%",
    height: 48,
    justifyContent: "flex-end",
  },
  miniBarFill: {
    width: "100%",
    borderRadius: 7,
    minHeight: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  miniBarValue: { fontSize: 12, color: "#FFFFFF", fontWeight: "800" },
  miniBarDate: { fontSize: 10, color: "#9CA3AF", fontWeight: "600" },
  miniBarMood: { fontSize: 9, color: "#6B7280", fontWeight: "600" },

  statRow: { flexDirection: "row", gap: 8 },
  statCard: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  statIcon: { minHeight: 26, alignItems: "center", justifyContent: "center" },
  statEmoji: { fontSize: 20 },
  statLabel: { fontSize: 10, color: "#9CA3AF", fontWeight: "600", textTransform: "uppercase" },
  statValue: { fontSize: 22, fontWeight: "800" },
  barTrack: {
    width: "100%",
    height: 4,
    backgroundColor: "#F3F4F6",
    borderRadius: 2,
    overflow: "hidden",
  },
  barFill: { height: 4, borderRadius: 2 },

  tagCloud: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tagChipTop: { backgroundColor: "#EDE5FF" },
  tagChipText: { fontSize: 13, color: "#374151", fontWeight: "500" },
  tagChipTextTop: { color: "#6D28D9" },
  tagChipCount: { fontSize: 11, color: "#9CA3AF" },
  tagChipCountTop: { color: "#9B6EFF" },

  contextGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  contextItem: {
    flexBasis: "31%",
    flexGrow: 1,
    minWidth: 96,
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  contextLabel: {
    fontSize: 10,
    color: "#9CA3AF",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  contextValue: { fontSize: 20, fontWeight: "800", color: "#1F2937" },
  contextMeta: { fontSize: 10, color: "#9CA3AF", fontWeight: "500" },
  observationList: { gap: 8 },
  observationBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  observationText: { flex: 1, fontSize: 13, color: "#374151", lineHeight: 19 },
  contextHint: { fontSize: 12, color: "#6B7280", lineHeight: 18 },

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
