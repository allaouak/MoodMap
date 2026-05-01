import { useEffect, useState, useCallback, useRef } from "react";
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
import { MoodEntry, MoodLevel, MOOD_COLOR, MOOD_EMOJI, MOOD_LABELS } from "@/types";

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

function moodLevelFor(avg: number): MoodLevel {
  return (Math.round(Math.max(1, Math.min(5, avg))) as MoodLevel);
}

function StatCard({
  label,
  avg,
  color,
  emoji,
}: {
  label: string;
  avg: number;
  color: string;
  emoji: string;
}) {
  const pct = ((avg - 1) / 4) * 100;
  return (
    <View style={styles.statCard}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{avg > 0 ? avg.toFixed(1) : "—"}</Text>
      {avg > 0 && (
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${pct}%` as any, backgroundColor: color }]} />
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
      <View style={[styles.miniBarFill, { height, backgroundColor: color }]} />
      <Text style={styles.miniBarLabel}>{format(date, "dd", { locale: fr })}</Text>
    </View>
  );
}

export default function InsightsScreen() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats7, setStats7] = useState<Stats | null>(null);
  const [stats30, setStats30] = useState<Stats | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const from7 = format(subDays(new Date(), 6), "yyyy-MM-dd");
      const from30 = format(subDays(new Date(), 29), "yyyy-MM-dd");

      const [e7, e30] = await Promise.all([
        moodService.getEntries(user.id, from7, today),
        moodService.getEntries(user.id, from30, today),
      ]);

      if (mountedRef.current) {
        setStats7(computeStats(e7));
        setStats30(computeStats(e30));
      }
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
            <Text style={styles.emptyEmoji}>📊</Text>
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
                    emoji={MOOD_EMOJI[moodLevelFor(stats7.avgMood)]}
                  />
                  <StatCard label="Énergie" avg={stats7.avgEnergy} color="#60A5FA" emoji="⚡" />
                  <StatCard label="Stress" avg={stats7.avgStress} color="#F97316" emoji="🌡️" />
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
                    emoji={MOOD_EMOJI[moodLevelFor(stats30.avgMood)]}
                  />
                  <StatCard label="Énergie" avg={stats30.avgEnergy} color="#60A5FA" emoji="⚡" />
                  <StatCard label="Stress" avg={stats30.avgStress} color="#F97316" emoji="🌡️" />
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

            {/* Message d'humeur globale */}
            {stats30 && stats30.entries.length > 0 && (
              <View style={[styles.moodSummary, { borderColor: MOOD_COLOR[moodLevelFor(stats30.avgMood)] + "40" }]}>
                <Text style={styles.moodSummaryEmoji}>
                  {MOOD_EMOJI[moodLevelFor(stats30.avgMood)]}
                </Text>
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

  pageTitle: { fontSize: 26, fontWeight: "700", color: "#1F2937", paddingHorizontal: 4 },

  emptyState: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyEmoji: { fontSize: 48 },
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
  cardSubtitle: { fontSize: 12, color: "#9CA3AF", marginTop: -8 },

  miniBarChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    height: 52,
    paddingBottom: 2,
  },
  miniBarCol: { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 3 },
  miniBarFill: { width: "100%", borderRadius: 4, minHeight: 4 },
  miniBarLabel: { fontSize: 9, color: "#9CA3AF" },

  statRow: { flexDirection: "row", gap: 8 },
  statCard: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
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

  moodSummary: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1.5,
  },
  moodSummaryEmoji: { fontSize: 32 },
  moodSummaryText: { flex: 1, fontSize: 14, color: "#374151", lineHeight: 20 },
});
