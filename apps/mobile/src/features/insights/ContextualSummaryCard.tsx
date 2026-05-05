import { type ComponentProps } from "react";
import { View, Text, StyleSheet } from "react-native";
import { AppIcon } from "@/components/ui/AppIcon";
import type { ContextualObservation } from "@/utils/contextual";

export interface ContextualStats {
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

type AppIconName = ComponentProps<typeof AppIcon>["name"];

const OBSERVATION_STYLE: Record<
  ContextualObservation["module"],
  { icon: AppIconName; color: string; backgroundColor: string }
> = {
  sleep: { icon: "moon-waning-crescent", color: "#6366F1", backgroundColor: "#EEF2FF" },
  activity: { icon: "shoe-sneaker", color: "#059669", backgroundColor: "#ECFDF5" },
  screen_time: { icon: "cellphone", color: "#0284C7", backgroundColor: "#E0F2FE" },
};

function ObservationItem({ observation }: { observation: ContextualObservation }) {
  const s = OBSERVATION_STYLE[observation.module];
  return (
    <View style={styles.observationBox}>
      <AppIcon name={s.icon} color={s.color} backgroundColor={s.backgroundColor} size={16} frameSize={30} />
      <Text style={styles.observationText}>{observation.text}</Text>
    </View>
  );
}

interface ContextualSummaryCardProps {
  contextual7: ContextualStats;
  contextual30: ContextualStats;
  observations: ContextualObservation[];
}

export function ContextualSummaryCard({
  contextual7,
  contextual30,
  observations,
}: ContextualSummaryCardProps) {
  const hasData =
    contextual30.sleepCount > 0 ||
    contextual30.activityCount > 0 ||
    contextual30.screenCount > 0;

  if (!hasData) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Rythmes du quotidien</Text>
      <Text style={styles.cardSubtitle}>Moyennes sur les données disponibles</Text>

      <View style={styles.grid}>
        {contextual7.sleepAvgHours != null && (
          <View style={styles.item}>
            <AppIcon name="moon-waning-crescent" color="#6366F1" backgroundColor="#EEF2FF" size={18} frameSize={34} />
            <Text style={styles.itemLabel}>Sommeil 7j</Text>
            <Text style={styles.itemValue}>{contextual7.sleepAvgHours.toFixed(1)} h</Text>
            <Text style={styles.itemMeta}>
              {contextual7.sleepCount}/{contextual7.sleepTotal} jour{contextual7.sleepTotal > 1 ? "s" : ""}
            </Text>
          </View>
        )}
        {contextual30.stepsAvg != null && (
          <View style={styles.item}>
            <AppIcon name="shoe-sneaker" color="#059669" backgroundColor="#ECFDF5" size={18} frameSize={34} />
            <Text style={styles.itemLabel}>Pas 30j</Text>
            <Text style={styles.itemValue}>{Math.round(contextual30.stepsAvg).toLocaleString("fr-FR")}</Text>
            <Text style={styles.itemMeta}>
              {contextual30.activityCount}/{contextual30.activityTotal} jour{contextual30.activityTotal > 1 ? "s" : ""}
            </Text>
          </View>
        )}
        {contextual30.screenAvgHours != null && (
          <View style={styles.item}>
            <AppIcon name="cellphone" color="#0284C7" backgroundColor="#E0F2FE" size={18} frameSize={34} />
            <Text style={styles.itemLabel}>Écran 30j</Text>
            <Text style={styles.itemValue}>{contextual30.screenAvgHours.toFixed(1)} h</Text>
            <Text style={styles.itemMeta}>
              {contextual30.screenCount}/{contextual30.screenTotal} jour{contextual30.screenTotal > 1 ? "s" : ""}
            </Text>
          </View>
        )}
      </View>

      {observations.length > 0 && (
        <View style={styles.observationList}>
          {observations.map((obs) => (
            <ObservationItem key={`${obs.module}-${obs.text}`} observation={obs} />
          ))}
        </View>
      )}

      <Text style={styles.hint}>
        Ces repères restent descriptifs : ils aident à observer tes rythmes sans conclure à une cause.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    gap: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#1F2937" },
  cardSubtitle: { fontSize: 13, lineHeight: 19, color: "#9CA3AF", marginTop: -8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  item: {
    flexBasis: "31%",
    flexGrow: 1,
    minWidth: 96,
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  itemLabel: { fontSize: 10, color: "#9CA3AF", fontWeight: "600", textTransform: "uppercase" },
  itemValue: { fontSize: 20, fontWeight: "800", color: "#1F2937" },
  itemMeta: { fontSize: 10, color: "#9CA3AF", fontWeight: "500" },
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
  hint: { fontSize: 12, color: "#6B7280", lineHeight: 18 },
});
