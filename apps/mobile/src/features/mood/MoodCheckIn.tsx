import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { MoodSlider } from "@/components/mood/MoodSlider";
import { Button } from "@/components/ui/Button";
import { moodService } from "@/services/mood.service";
import { contextualEntryService } from "@/services/contextual-entry.service";
import { sleepService } from "@/services/sleep.service";
import { activityService } from "@/services/activity.service";
import { useContextualStore } from "@/stores/contextual.store";
import { MoodEntry, MoodLevel, EnergyLevel, StressLevel } from "@/types";
import type { ContextualEntry } from "@/types/contextual";
import { todayISOInTimezone } from "@/utils/date";
import { formatSleepDuration } from "@/utils/contextual";
import { checkInSchema } from "@/lib/validation";

const MAX_TAGS = 10;

type CheckInForm = z.infer<typeof checkInSchema>;

const SUGGESTED_TAGS = [
  "travail", "famille", "sport", "repos", "social",
  "créativité", "nature", "lecture", "musique", "anxiété",
];

interface MoodCheckInProps {
  userId: string;
  timezone?: string;
  existingEntry?: MoodEntry | null;
  onSaved: (entry: MoodEntry) => void;
  onCancel?: () => void;
}

export function MoodCheckIn({
  userId,
  timezone = "UTC",
  existingEntry,
  onSaved,
  onCancel,
}: MoodCheckInProps) {
  const { consents } = useContextualStore();
  const [loading, setLoading] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>(existingEntry?.tags ?? []);
  const [contextualEntry, setContextualEntry] = useState<ContextualEntry | null>(null);
  const [loadingContext, setLoadingContext] = useState(false);
  const [screenTimeInput, setScreenTimeInput] = useState("");

  const hasAnyConsent = consents.sleep || consents.activity || consents.screen_time;
  const today = todayISOInTimezone(timezone);

  useEffect(() => {
    if (!hasAnyConsent) return;

    const init = async () => {
      setLoadingContext(true);
      try {
        let entry = await contextualEntryService.getForDate(userId, today);

        if (consents.sleep && !entry?.sleep_duration_min) {
          const sleep = await sleepService.fetchForDate(today);
          if (sleep) await contextualEntryService.saveSleep(userId, today, sleep);
        }
        if (consents.activity && !entry?.activity_steps) {
          const activity = await activityService.fetchForDate(today);
          if (activity) await contextualEntryService.saveActivity(userId, today, activity);
        }

        entry = await contextualEntryService.getForDate(userId, today);
        setContextualEntry(entry);

        if (entry?.screen_total_min && consents.screen_time) {
          setScreenTimeInput(String(Math.round((entry.screen_total_min / 60) * 10) / 10));
        }
      } catch {
        // optionnel — ne bloque pas le check-in
      } finally {
        setLoadingContext(false);
      }
    };

    init();
  }, [consents.activity, consents.screen_time, consents.sleep, hasAnyConsent, today, userId]);

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
      const input = {
        mood: values.mood as MoodLevel,
        energy: values.energy as EnergyLevel,
        stress: values.stress as StressLevel,
        note: values.note?.trim() || null,
        tags: selectedTags,
        entry_date: today,
      };

      let screenMinutes: number | null | undefined;
      if (consents.screen_time) {
        const trimmedScreenTime = screenTimeInput.trim();
        if (trimmedScreenTime) {
          const hours = parseFloat(trimmedScreenTime.replace(",", "."));
          if (isNaN(hours) || hours < 0 || hours > 24) {
            Alert.alert("Temps d'écran invalide", "Saisis une durée entre 0 et 24 heures.");
            return;
          }
          screenMinutes = Math.round(hours * 60);
        } else {
          screenMinutes = null;
        }
      }

      let entry: MoodEntry;
      if (existingEntry) {
        entry = await moodService.updateEntry(existingEntry.id, userId, input);
      } else {
        entry = await moodService.createEntry(userId, input);
      }

      if (screenMinutes !== undefined) {
        if (screenMinutes === null) {
          await contextualEntryService.clearScreenTime(userId, today);
        } else {
          await contextualEntryService.saveScreenTime(userId, today, {
            total_min: screenMinutes,
            source: "manual",
          });
        }
      }

      onSaved(entry);
    } catch {
      Alert.alert("Erreur", "Impossible d'enregistrer. Vérifie ta connexion et réessaie.");
    } finally {
      setLoading(false);
    }
  };

  const hasContextualData =
    contextualEntry?.sleep_duration_min != null || contextualEntry?.activity_steps != null;

  return (
    <View className="bg-white rounded-3xl p-5 gap-6">
      <Text className="text-lg font-bold text-gray-900">
        {existingEntry ? "Modifier mon ressenti" : "Comment tu te sens ?"}
      </Text>

      <Controller
        control={control}
        name="mood"
        render={({ field: { value, onChange } }) => (
          <MoodSlider label="Humeur" value={value as MoodLevel} onChange={onChange} emoji />
        )}
      />

      <Controller
        control={control}
        name="energy"
        render={({ field: { value, onChange } }) => (
          <MoodSlider label="Énergie" value={value as EnergyLevel} onChange={onChange} />
        )}
      />

      <Controller
        control={control}
        name="stress"
        render={({ field: { value, onChange } }) => (
          <MoodSlider label="Stress" value={value as StressLevel} onChange={onChange} />
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

      {/* Données contextuelles du jour */}
      {hasAnyConsent && (
        <View className="gap-2">
          <Text className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
            Données du jour
          </Text>
          {loadingContext ? (
            <ActivityIndicator color="#6D28D9" size="small" style={{ alignSelf: "flex-start" }} />
          ) : (
            <View className="gap-3">
              {hasContextualData && (
                <View className="flex-row flex-wrap gap-2">
                  {contextualEntry?.sleep_duration_min != null && (
                    <View className="flex-row items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-full">
                      <Text>🌙</Text>
                      <Text className="text-sm font-medium text-indigo-700">
                        {formatSleepDuration(contextualEntry.sleep_duration_min)} de sommeil
                      </Text>
                    </View>
                  )}
                  {contextualEntry?.activity_steps != null && (
                    <View className="flex-row items-center gap-1.5 bg-green-50 px-3 py-1.5 rounded-full">
                      <Text>👟</Text>
                      <Text className="text-sm font-medium text-green-700">
                        {contextualEntry.activity_steps.toLocaleString("fr-FR")} pas
                      </Text>
                    </View>
                  )}
                </View>
              )}
              {consents.screen_time && (
                <View className="gap-1.5">
                  <Text className="text-xs text-gray-500">Temps d'écran (heures)</Text>
                  <TextInput
                    className="bg-gray-50 rounded-xl px-3 py-2 text-base text-gray-900 w-28"
                    placeholder="ex : 3.5"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="decimal-pad"
                    value={screenTimeInput}
                    onChangeText={setScreenTimeInput}
                    maxLength={4}
                  />
                </View>
              )}
            </View>
          )}
        </View>
      )}

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
        {onCancel && <Button label="Annuler" variant="ghost" onPress={onCancel} />}
      </View>
    </View>
  );
}
