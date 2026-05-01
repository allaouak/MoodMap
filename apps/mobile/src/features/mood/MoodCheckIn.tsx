import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { MoodSlider } from "@/components/mood/MoodSlider";
import { Button } from "@/components/ui/Button";
import { moodService } from "@/services/mood.service";
import { MoodEntry, MoodLevel, EnergyLevel, StressLevel } from "@/types";
import { todayISO } from "@/utils/date";

const MAX_TAGS = 10;

const checkInSchema = z.object({
  mood: z.number().int().min(1).max(5),
  energy: z.number().int().min(1).max(5),
  stress: z.number().int().min(1).max(5),
  note: z.string().trim().max(500).optional(),
});

type CheckInForm = z.infer<typeof checkInSchema>;

const SUGGESTED_TAGS = [
  "travail", "famille", "sport", "repos", "social",
  "créativité", "nature", "lecture", "musique", "anxiété",
];

interface MoodCheckInProps {
  userId: string;
  existingEntry?: MoodEntry | null;
  onSaved: (entry: MoodEntry) => void;
  onCancel?: () => void;
}

export function MoodCheckIn({ userId, existingEntry, onSaved, onCancel }: MoodCheckInProps) {
  const [loading, setLoading] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>(
    existingEntry?.tags ?? []
  );

  const { control, handleSubmit } = useForm<CheckInForm>({
    resolver: zodResolver(checkInSchema),
    defaultValues: {
      mood: existingEntry?.mood ?? 3,
      energy: existingEntry?.energy ?? 3,
      stress: existingEntry?.stress ?? 3,
      note: existingEntry?.note ?? "",
    },
  });

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= MAX_TAGS) return prev;
      return [...prev, tag];
    });
  };

  const onSubmit = async (values: CheckInForm) => {
    try {
      setLoading(true);
      const trimmedNote = values.note?.trim();
      const input = {
        mood: values.mood as MoodLevel,
        energy: values.energy as EnergyLevel,
        stress: values.stress as StressLevel,
        // Omettre note si vide — évite note: undefined avec exactOptionalPropertyTypes
        ...(trimmedNote ? { note: trimmedNote } : {}),
        tags: selectedTags,
        entry_date: todayISO(),
      };

      let entry: MoodEntry;
      if (existingEntry) {
        entry = await moodService.updateEntry(existingEntry.id, userId, input);
      } else {
        entry = await moodService.createEntry(userId, input);
      }
      onSaved(entry);
    } catch (err: unknown) {
      Alert.alert("Erreur", err instanceof Error ? err.message : "Impossible d'enregistrer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="bg-white rounded-3xl p-5 gap-6">
      <Text className="text-lg font-bold text-gray-900">
        {existingEntry ? "Modifier mon ressenti" : "Comment tu te sens ?"}
      </Text>

      <Controller
        control={control}
        name="mood"
        render={({ field: { value, onChange } }) => (
          <MoodSlider
            label="Humeur"
            value={value as MoodLevel}
            onChange={onChange}
            emoji
          />
        )}
      />

      <Controller
        control={control}
        name="energy"
        render={({ field: { value, onChange } }) => (
          <MoodSlider
            label="Énergie"
            value={value as EnergyLevel}
            onChange={onChange}
          />
        )}
      />

      <Controller
        control={control}
        name="stress"
        render={({ field: { value, onChange } }) => (
          <MoodSlider
            label="Stress"
            value={value as StressLevel}
            onChange={onChange}
          />
        )}
      />

      {/* Tags */}
      <View className="gap-2">
        <Text className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
          Contexte
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {SUGGESTED_TAGS.map((tag) => (
            <TouchableOpacity
              key={tag}
              onPress={() => toggleTag(tag)}
              className={`px-3 py-1.5 rounded-full border ${
                selectedTags.includes(tag)
                  ? "bg-brand-500 border-brand-500"
                  : "bg-gray-50 border-gray-200"
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  selectedTags.includes(tag) ? "text-white" : "text-gray-500"
                }`}
              >
                {tag}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Note */}
      <Controller
        control={control}
        name="note"
        render={({ field: { value, onChange } }) => (
          <View className="gap-2">
            <Text className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
              Note libre
            </Text>
            <TextInput
              className="bg-surface-muted rounded-2xl px-4 py-3 text-base text-gray-900 min-h-[80px]"
              placeholder="Quelques mots sur ta journée... (optionnel)"
              placeholderTextColor="#9CA3AF"
              multiline
              textAlignVertical="top"
              value={value}
              onChangeText={onChange}
              maxLength={500}
            />
            <Text className="text-xs text-gray-400 text-right">
              {(value ?? "").length}/500
            </Text>
          </View>
        )}
      />

      <View className="gap-2">
        <Button
          label={existingEntry ? "Mettre à jour" : "Enregistrer"}
          loading={loading}
          onPress={handleSubmit(onSubmit)}
        />
        {onCancel && (
          <Button label="Annuler" variant="ghost" onPress={onCancel} />
        )}
      </View>
    </View>
  );
}
