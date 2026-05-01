import { View, Text, TouchableOpacity } from "react-native";
import { MoodEntry, MOOD_EMOJI, MOOD_LABELS, MOOD_COLOR } from "@/types";
import { formatTime } from "@/utils/date";

interface TodayCardProps {
  entry: MoodEntry;
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

export function TodayCard({ entry, onEdit }: TodayCardProps) {
  const moodColor = MOOD_COLOR[entry.mood];

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
            <Text className="text-4xl">{MOOD_EMOJI[entry.mood]}</Text>
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
