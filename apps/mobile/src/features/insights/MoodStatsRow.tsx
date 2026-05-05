import { type ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { MoodFaceIcon } from "@/components/mood/MoodFaceIcon";
import { AppIcon } from "@/components/ui/AppIcon";
import { MoodLevel, MOOD_COLOR } from "@/types";

function moodLevelFor(average: number): MoodLevel {
  return Math.round(Math.max(1, Math.min(5, average))) as MoodLevel;
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
    <View style={styles.card}>
      <View style={styles.iconWrap}>{icon}</View>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color }]}>{avg > 0 ? avg.toFixed(1) : "—"}</Text>
      {avg > 0 && (
        <View style={styles.barTrack}>
          <View
            style={[styles.barFill, { width: `${pct}%` as `${number}%`, backgroundColor: color }]}
          />
        </View>
      )}
    </View>
  );
}

interface MoodStatsRowProps {
  avgMood: number;
  avgEnergy: number;
  avgStress: number;
}

export function MoodStatsRow({ avgMood, avgEnergy, avgStress }: MoodStatsRowProps) {
  const moodLevel = moodLevelFor(avgMood);
  return (
    <View style={styles.row}>
      <StatCard
        label="Humeur"
        avg={avgMood}
        color={MOOD_COLOR[moodLevel]}
        icon={<MoodFaceIcon level={moodLevel} size={26} />}
      />
      <StatCard
        label="Énergie"
        avg={avgEnergy}
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
        avg={avgStress}
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
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  card: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  iconWrap: { minHeight: 26, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 10, color: "#9CA3AF", fontWeight: "600", textTransform: "uppercase" },
  value: { fontSize: 22, fontWeight: "800" },
  barTrack: {
    width: "100%",
    height: 4,
    backgroundColor: "#F3F4F6",
    borderRadius: 2,
    overflow: "hidden",
  },
  barFill: { height: 4, borderRadius: 2 },
});
