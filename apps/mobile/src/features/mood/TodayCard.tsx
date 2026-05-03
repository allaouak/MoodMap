import type { ComponentProps } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MoodEntry, MOOD_LABELS, MOOD_COLOR } from "@/types";
import { MoodFaceIcon } from "@/components/mood/MoodFaceIcon";
import { AppIcon } from "@/components/ui/AppIcon";
import { ContextualEntry } from "@/types/contextual";
import { formatHoursFromMinutes, formatSleepDuration, hasContextualData } from "@/utils/contextual";
import { formatTime } from "@/utils/date";

interface TodayCardProps {
  entry: MoodEntry;
  contextualEntry?: ContextualEntry | null;
  onEdit: () => void;
}

function MetricBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View className="flex-1 items-center bg-gray-50 rounded-2xl py-3 gap-1">
      <Text className="text-xs text-gray-400 font-medium uppercase tracking-wide">
        {label}
      </Text>
      <View
        className="w-8 h-8 rounded-full items-center justify-center"
        style={{ backgroundColor: color + "20" }}
      >
        <Text className="text-sm font-bold" style={{ color }}>
          {value}
        </Text>
      </View>
    </View>
  );
}

interface ContextMetricProps {
  icon: ComponentProps<typeof AppIcon>["name"];
  label: string;
  value: string;
  color: string;
  backgroundColor: string;
}

function ContextMetric({ icon, label, value, color, backgroundColor }: ContextMetricProps) {
  return (
    <View className="flex-row items-center gap-2 bg-gray-50 rounded-2xl px-3 py-2">
      <AppIcon
        name={icon}
        color={color}
        backgroundColor={backgroundColor}
        size={16}
        frameSize={30}
      />
      <View>
        <Text className="text-[11px] text-gray-400 font-medium">{label}</Text>
        <Text className="text-sm text-gray-700 font-semibold">{value}</Text>
      </View>
    </View>
  );
}

export function TodayCard({ entry, contextualEntry, onEdit }: TodayCardProps) {
  const moodColor = MOOD_COLOR[entry.mood];
  const showContext = hasContextualData(contextualEntry);

  return (
    <View className="bg-white rounded-3xl overflow-hidden">
      {/* Bande couleur humeur */}
      <View className="h-1.5" style={{ backgroundColor: moodColor }} />

      <View className="p-5 gap-4">
        {/* Humeur principale */}
        <View className="flex-row items-center gap-4">
          <View
            className="w-16 h-16 rounded-full items-center justify-center"
            style={{ backgroundColor: moodColor + "20" }}
          >
            <MoodFaceIcon level={entry.mood} size={44} />
          </View>
          <View className="flex-1 gap-0.5">
            <Text className="text-xl font-bold text-gray-900">
              {MOOD_LABELS[entry.mood]}
            </Text>
            <Text className="text-sm text-gray-400">
              Enregistré à {formatTime(entry.created_at)}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onEdit}
            className="bg-gray-100 px-3 py-1.5 rounded-xl"
          >
            <Text className="text-sm text-gray-600 font-medium">Modifier</Text>
          </TouchableOpacity>
        </View>

        {/* Métriques énergie / stress */}
        <View className="flex-row gap-2">
          <MetricBadge label="Énergie" value={entry.energy} color="#60A5FA" />
          <MetricBadge label="Stress" value={entry.stress} color="#F97316" />
        </View>

        {/* Tags */}
        {entry.tags.length > 0 && (
          <View className="flex-row flex-wrap gap-1.5">
            {entry.tags.map((tag) => (
              <View
                key={tag}
                className="bg-brand-50 px-3 py-1 rounded-full"
              >
                <Text className="text-xs text-brand-600 font-medium">{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {showContext && (
          <View className="gap-2">
            <Text className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
              Données du jour
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {contextualEntry?.sleep_duration_min != null && (
                <ContextMetric
                  icon="moon-waning-crescent"
                  label="Sommeil"
                  value={formatSleepDuration(contextualEntry.sleep_duration_min)}
                  color="#6D28D9"
                  backgroundColor="#F3E8FF"
                />
              )}
              {contextualEntry?.activity_steps != null && (
                <ContextMetric
                  icon="shoe-sneaker"
                  label="Activité"
                  value={`${contextualEntry.activity_steps.toLocaleString("fr-FR")} pas`}
                  color="#059669"
                  backgroundColor="#ECFDF5"
                />
              )}
              {contextualEntry?.screen_total_min != null && (
                <ContextMetric
                  icon="cellphone"
                  label="Écran"
                  value={formatHoursFromMinutes(contextualEntry.screen_total_min)}
                  color="#0284C7"
                  backgroundColor="#EFF6FF"
                />
              )}
            </View>
          </View>
        )}

        {/* Note */}
        {entry.note && (
          <View className="bg-surface-soft rounded-2xl px-4 py-3">
            <Text className="text-sm text-gray-600 leading-relaxed italic">
              "{entry.note}"
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
