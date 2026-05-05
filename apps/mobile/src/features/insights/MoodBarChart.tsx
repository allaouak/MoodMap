import { View, Text, StyleSheet } from "react-native";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { MoodEntry, MOOD_COLOR } from "@/types";

function MiniBar({ entry }: { entry: MoodEntry }) {
  const color = MOOD_COLOR[entry.mood];
  const height = (entry.mood / 5) * 40 + 4;
  const date = parseISO(entry.entry_date);
  return (
    <View style={styles.col}>
      <View style={styles.track}>
        <View style={[styles.fill, { height, backgroundColor: color }]}>
          <Text style={styles.value}>{entry.mood}</Text>
        </View>
      </View>
      <Text style={styles.date}>{format(date, "EEE", { locale: fr })}</Text>
    </View>
  );
}

interface MoodBarChartProps {
  entries: MoodEntry[];
}

export function MoodBarChart({ entries }: MoodBarChartProps) {
  if (entries.length === 0) return null;
  return (
    <View style={styles.chart}>
      {[...entries].reverse().map((e) => (
        <MiniBar key={e.id} entry={e} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    minHeight: 82,
    paddingTop: 4,
  },
  col: { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 4 },
  track: { width: "100%", height: 48, justifyContent: "flex-end" },
  fill: {
    width: "100%",
    borderRadius: 7,
    minHeight: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  value: { fontSize: 12, color: "#FFFFFF", fontWeight: "800" },
  date: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "600",
    textTransform: "capitalize",
  },
});
