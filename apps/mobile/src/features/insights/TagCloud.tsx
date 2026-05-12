import { useState } from "react";
import { View, Text, Pressable, Modal, StyleSheet } from "react-native";
import { MOOD_COLOR, MoodLevel } from "@/types";

interface TagStat {
  tag: string;
  count: number;
  avgMood: number;
  avgEnergy: number;
  avgStress: number;
}

interface TagCloudProps {
  topTags: TagStat[];
}

function toLevel(value: number): MoodLevel {
  return Math.round(Math.max(1, Math.min(5, value))) as MoodLevel;
}

function stressColor(level: MoodLevel): string {
  return MOOD_COLOR[Math.max(1, Math.min(5, 6 - level)) as MoodLevel];
}

export function TagCloud({ topTags }: TagCloudProps) {
  const [selected, setSelected] = useState<TagStat | null>(null);

  if (topTags.length === 0) return null;

  return (
    <>
      <View style={styles.cloud}>
        {topTags.map((item, i) => {
          const dotColor = MOOD_COLOR[toLevel(item.avgMood)];
          return (
            <Pressable
              key={item.tag}
              style={({ pressed }) => [
                styles.chip,
                i === 0 && styles.chipTop,
                pressed && styles.chipPressed,
              ]}
              onPress={() => setSelected(item)}
              accessibilityRole="button"
              accessibilityLabel={`Tag ${item.tag}, utilisé ${item.count} fois, appuie pour le détail`}
            >
              <View style={[styles.dot, { backgroundColor: dotColor }]} />
              <Text style={[styles.chipText, i === 0 && styles.chipTextTop]}>
                {item.tag}
              </Text>
              <Text style={[styles.chipCount, i === 0 && styles.chipCountTop]}>
                ×{item.count}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Modal
        visible={!!selected}
        transparent
        animationType="fade"
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelected(null)} />
          {selected && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTag}>{selected.tag}</Text>
                <Text style={styles.cardCount}>
                  Utilisé {selected.count} fois ce mois
                </Text>
              </View>

              <View style={styles.metrics}>
                <MetricRow
                  label="Humeur"
                  emoji="😊"
                  level={toLevel(selected.avgMood)}
                  color={MOOD_COLOR[toLevel(selected.avgMood)]}
                  value={selected.avgMood}
                />
                <MetricRow
                  label="Énergie"
                  emoji="⚡"
                  level={toLevel(selected.avgEnergy)}
                  color={MOOD_COLOR[toLevel(selected.avgEnergy)]}
                  value={selected.avgEnergy}
                />
                <MetricRow
                  label="Stress"
                  emoji="🌊"
                  level={toLevel(selected.avgStress)}
                  color={stressColor(toLevel(selected.avgStress))}
                  value={selected.avgStress}
                  invert
                />
              </View>

              <Text style={styles.cardNote}>
                Moyenne sur tes entrées contenant ce tag.
              </Text>
            </View>
          )}
        </View>
      </Modal>
    </>
  );
}

function MetricRow({
  label,
  emoji,
  level,
  color,
  value,
  invert = false,
}: {
  label: string;
  emoji: string;
  level: MoodLevel;
  color: string;
  value: number;
  invert?: boolean;
}) {
  const filledCount = invert ? 6 - level : level;
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricEmoji}>{emoji}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={styles.metricDots}>
        {[1, 2, 3, 4, 5].map((i) => (
          <View
            key={i}
            style={[
              styles.metricDot,
              { backgroundColor: i <= filledCount ? color : "#E5E7EB" },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.metricValue, { color }]}>{value.toFixed(1)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cloud: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  chipTop: { backgroundColor: "#EDE5FF" },
  chipPressed: { opacity: 0.7 },

  dot: { width: 8, height: 8, borderRadius: 4 },

  chipText: { fontSize: 13, color: "#374151", fontWeight: "500" },
  chipTextTop: { color: "#6D28D9" },
  chipCount: { fontSize: 11, color: "#9CA3AF" },
  chipCountTop: { color: "#9B6EFF" },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    gap: 20,
  },
  cardHeader: { gap: 4 },
  cardTag: { fontSize: 20, fontWeight: "700", color: "#1F2937", textTransform: "capitalize" },
  cardCount: { fontSize: 13, color: "#9CA3AF" },

  metrics: { gap: 14 },
  metricRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  metricEmoji: { fontSize: 15, width: 22 },
  metricLabel: { fontSize: 13, color: "#6B7280", width: 52 },
  metricDots: { flexDirection: "row", gap: 4, flex: 1 },
  metricDot: { width: 10, height: 10, borderRadius: 5 },
  metricValue: { fontSize: 13, fontWeight: "600", width: 30, textAlign: "right" },

  cardNote: { fontSize: 12, color: "#D1D5DB", textAlign: "center" },
});
