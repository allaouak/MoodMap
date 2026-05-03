import { useState, useEffect, useCallback } from "react";
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
type NativeContextModule = "sleep" | "activity";
type ContextSyncState = "idle" | "syncing" | "synced" | "empty" | "error";

interface ContextSyncStatus {
  state: ContextSyncState;
  detail: string;
}

const INITIAL_CONTEXT_STATUS: Record<NativeContextModule, ContextSyncStatus> = {
  sleep: { state: "idle", detail: "" },
  activity: { state: "idle", detail: "" },
};

function sleepQualityFromMinutes(min: number): 1 | 2 | 3 | 4 | 5 {
  if (min >= 450) return 5;
  if (min >= 360) return 4;
  if (min >= 300) return 3;
  if (min >= 240) return 2;
  return 1;
}

function isHHMM(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

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
  const [sleepDurationInput, setSleepDurationInput] = useState("");
  const [sleepBedtimeInput, setSleepBedtimeInput] = useState("23:00");
  const [sleepWakeInput, setSleepWakeInput] = useState("07:00");
  const [savingManualSleep, setSavingManualSleep] = useState(false);
  const [contextStatus, setContextStatus] =
    useState<Record<NativeContextModule, ContextSyncStatus>>(INITIAL_CONTEXT_STATUS);

  const hasAnyConsent = consents.sleep || consents.activity || consents.screen_time;
  const today = todayISOInTimezone(timezone);

  const updateContextStatus = useCallback(
    (module: NativeContextModule, status: ContextSyncStatus) => {
      setContextStatus((prev) => ({ ...prev, [module]: status }));
    },
    []
  );

  const syncContext = useCallback(async () => {
    if (!hasAnyConsent) {
      setContextualEntry(null);
      setContextStatus(INITIAL_CONTEXT_STATUS);
      return;
    }

    setLoadingContext(true);
    try {
      let entry = await contextualEntryService.getForDate(userId, today);

      if (consents.sleep) {
        if (entry?.sleep_duration_min != null) {
          updateContextStatus("sleep", {
            state: "synced",
            detail: `${formatSleepDuration(entry.sleep_duration_min)} déjà enregistré`,
          });
        } else {
          updateContextStatus("sleep", { state: "syncing", detail: "Lecture de Santé..." });
          try {
            const sleep = await sleepService.fetchForDate(today);
            if (sleep) {
              await contextualEntryService.saveSleep(userId, today, sleep);
              updateContextStatus("sleep", {
                state: "synced",
                detail: `${formatSleepDuration(sleep.duration_min)} détecté`,
              });
            } else {
              updateContextStatus("sleep", {
                state: "empty",
                detail: "Aucune donnée sommeil trouvée pour cette nuit",
              });
            }
          } catch {
            updateContextStatus("sleep", {
              state: "error",
              detail: "Lecture du sommeil impossible pour le moment",
            });
          }
        }
      }

      if (consents.activity) {
        if (entry?.activity_steps != null) {
          updateContextStatus("activity", {
            state: "synced",
            detail: `${entry.activity_steps.toLocaleString("fr-FR")} pas déjà enregistrés`,
          });
        } else {
          updateContextStatus("activity", { state: "syncing", detail: "Lecture de Santé..." });
          try {
            const activity = await activityService.fetchForDate(today);
            if (activity) {
              await contextualEntryService.saveActivity(userId, today, activity);
              updateContextStatus("activity", {
                state: "synced",
                detail: `${activity.steps.toLocaleString("fr-FR")} pas détectés`,
              });
            } else {
              updateContextStatus("activity", {
                state: "empty",
                detail: "Aucune activité trouvée pour aujourd'hui",
              });
            }
          } catch {
            updateContextStatus("activity", {
              state: "error",
              detail: "Lecture de l'activité impossible pour le moment",
            });
          }
        }
      }

      entry = await contextualEntryService.getForDate(userId, today);
      setContextualEntry(entry);

      if (entry?.screen_total_min && consents.screen_time) {
        setScreenTimeInput(String(Math.round((entry.screen_total_min / 60) * 10) / 10));
      }
      if (entry?.sleep_duration_min && consents.sleep) {
        setSleepDurationInput(String(Math.round((entry.sleep_duration_min / 60) * 10) / 10));
        if (entry.sleep_bedtime) setSleepBedtimeInput(entry.sleep_bedtime);
        if (entry.sleep_wake_time) setSleepWakeInput(entry.sleep_wake_time);
      }
    } catch {
      if (consents.sleep) {
        updateContextStatus("sleep", {
          state: "error",
          detail: "Synchronisation du sommeil impossible",
        });
      }
      if (consents.activity) {
        updateContextStatus("activity", {
          state: "error",
          detail: "Synchronisation de l'activité impossible",
        });
      }
    } finally {
      setLoadingContext(false);
    }
  }, [
    consents.activity,
    consents.screen_time,
    consents.sleep,
    hasAnyConsent,
    today,
    updateContextStatus,
    userId,
  ]);

  useEffect(() => {
    syncContext();
  }, [syncContext]);

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

  const saveManualSleep = async () => {
    const durationHours = parseFloat(sleepDurationInput.trim().replace(",", "."));
    if (isNaN(durationHours) || durationHours <= 0 || durationHours > 24) {
      Alert.alert("Sommeil invalide", "Saisis une durée entre 0 et 24 heures.");
      return;
    }
    if (!isHHMM(sleepBedtimeInput) || !isHHMM(sleepWakeInput)) {
      Alert.alert("Horaires invalides", "Utilise le format HH:mm, par exemple 23:30.");
      return;
    }

    try {
      setSavingManualSleep(true);
      const durationMin = Math.round(durationHours * 60);
      await contextualEntryService.saveSleep(userId, today, {
        duration_min: durationMin,
        bedtime: sleepBedtimeInput,
        wake_time: sleepWakeInput,
        quality: sleepQualityFromMinutes(durationMin),
        source: "manual",
      });
      const entry = await contextualEntryService.getForDate(userId, today);
      setContextualEntry(entry);
      updateContextStatus("sleep", {
        state: "synced",
        detail: `${formatSleepDuration(durationMin)} saisi manuellement`,
      });
    } catch {
      Alert.alert("Erreur", "Impossible d'enregistrer le sommeil manuel.");
    } finally {
      setSavingManualSleep(false);
    }
  };

  const contextStatusStyle = (state: ContextSyncState) => {
    if (state === "synced") return "bg-emerald-50 border-emerald-100";
    if (state === "empty") return "bg-amber-50 border-amber-100";
    if (state === "error") return "bg-red-50 border-red-100";
    return "bg-gray-50 border-gray-100";
  };

  const contextStatusTextStyle = (state: ContextSyncState) => {
    if (state === "synced") return "text-emerald-700";
    if (state === "empty") return "text-amber-700";
    if (state === "error") return "text-red-700";
    return "text-gray-600";
  };

  const contextStatusLabel = (state: ContextSyncState) => {
    if (state === "synced") return "Synchronisé";
    if (state === "syncing") return "Synchronisation";
    if (state === "empty") return "Aucune donnée";
    if (state === "error") return "À vérifier";
    return "En attente";
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
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
              Données contextuelles
            </Text>
            <TouchableOpacity
              onPress={syncContext}
              disabled={loadingContext}
              className={`px-3 py-1.5 rounded-full ${
                loadingContext ? "bg-gray-100" : "bg-brand-50"
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  loadingContext ? "text-gray-400" : "text-brand-700"
                }`}
              >
                Resynchroniser
              </Text>
            </TouchableOpacity>
          </View>

          <View className="gap-2">
            {consents.sleep && (
              <View
                className={`border rounded-2xl px-3 py-3 gap-1 ${contextStatusStyle(
                  contextStatus.sleep.state
                )}`}
              >
                <View className="flex-row items-center justify-between gap-3">
                  <Text className="text-sm font-semibold text-gray-900">Sommeil</Text>
                  <Text
                    className={`text-xs font-semibold ${contextStatusTextStyle(
                      contextStatus.sleep.state
                    )}`}
                  >
                    {contextStatusLabel(contextStatus.sleep.state)}
                  </Text>
                </View>
                <Text
                  className={`text-xs leading-5 ${contextStatusTextStyle(
                    contextStatus.sleep.state
                  )}`}
                >
                  {contextStatus.sleep.detail || "Autorisé, prêt à synchroniser"}
                </Text>
                {contextualEntry?.sleep_duration_min != null && (
                  <Text className="text-xs text-gray-500">
                    Coucher {contextualEntry.sleep_bedtime ?? "--:--"} · Réveil{" "}
                    {contextualEntry.sleep_wake_time ?? "--:--"}
                  </Text>
                )}
                {(contextStatus.sleep.state === "empty" ||
                  contextStatus.sleep.state === "error" ||
                  contextualEntry?.sleep_source === "manual") && (
                  <View className="gap-2 pt-2">
                    <Text className="text-xs font-semibold text-gray-600">
                      Saisie manuelle
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      <View className="gap-1">
                        <Text className="text-xs text-gray-500">Durée</Text>
                        <TextInput
                          className="bg-white rounded-xl px-3 py-2 text-base text-gray-900 w-24"
                          placeholder="7.5"
                          placeholderTextColor="#9CA3AF"
                          keyboardType="decimal-pad"
                          value={sleepDurationInput}
                          onChangeText={setSleepDurationInput}
                          maxLength={4}
                        />
                      </View>
                      <View className="gap-1">
                        <Text className="text-xs text-gray-500">Coucher</Text>
                        <TextInput
                          className="bg-white rounded-xl px-3 py-2 text-base text-gray-900 w-24"
                          placeholder="23:00"
                          placeholderTextColor="#9CA3AF"
                          keyboardType="numbers-and-punctuation"
                          value={sleepBedtimeInput}
                          onChangeText={setSleepBedtimeInput}
                          maxLength={5}
                        />
                      </View>
                      <View className="gap-1">
                        <Text className="text-xs text-gray-500">Réveil</Text>
                        <TextInput
                          className="bg-white rounded-xl px-3 py-2 text-base text-gray-900 w-24"
                          placeholder="07:00"
                          placeholderTextColor="#9CA3AF"
                          keyboardType="numbers-and-punctuation"
                          value={sleepWakeInput}
                          onChangeText={setSleepWakeInput}
                          maxLength={5}
                        />
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={saveManualSleep}
                      disabled={savingManualSleep}
                      className={`self-start px-3 py-2 rounded-full ${
                        savingManualSleep ? "bg-gray-100" : "bg-amber-100"
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          savingManualSleep ? "text-gray-400" : "text-amber-800"
                        }`}
                      >
                        {savingManualSleep ? "Enregistrement..." : "Enregistrer le sommeil"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {consents.activity && (
              <View
                className={`border rounded-2xl px-3 py-3 gap-1 ${contextStatusStyle(
                  contextStatus.activity.state
                )}`}
              >
                <View className="flex-row items-center justify-between gap-3">
                  <Text className="text-sm font-semibold text-gray-900">Activité physique</Text>
                  <Text
                    className={`text-xs font-semibold ${contextStatusTextStyle(
                      contextStatus.activity.state
                    )}`}
                  >
                    {contextStatusLabel(contextStatus.activity.state)}
                  </Text>
                </View>
                <Text
                  className={`text-xs leading-5 ${contextStatusTextStyle(
                    contextStatus.activity.state
                  )}`}
                >
                  {contextStatus.activity.detail || "Autorisé, prêt à synchroniser"}
                </Text>
                {contextualEntry?.activity_training_min != null && (
                  <Text className="text-xs text-gray-500">
                    {contextualEntry.activity_training_min} min d'entraînement ·{" "}
                    {contextualEntry.activity_active_min ?? 0} min actives
                  </Text>
                )}
              </View>
            )}

            {consents.screen_time && (
              <View className="border border-sky-100 bg-sky-50 rounded-2xl px-3 py-3 gap-2">
                <View className="flex-row items-center justify-between gap-3">
                  <Text className="text-sm font-semibold text-gray-900">Temps d'écran</Text>
                  <Text className="text-xs font-semibold text-sky-700">
                    {screenTimeInput.trim() ? "Saisi" : "Manuel"}
                  </Text>
                </View>
                <View className="gap-1.5">
                  <Text className="text-xs text-sky-700">Durée aujourd'hui en heures</Text>
                  <TextInput
                    className="bg-white rounded-xl px-3 py-2 text-base text-gray-900 w-28"
                    placeholder="ex : 3.5"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="decimal-pad"
                    value={screenTimeInput}
                    onChangeText={setScreenTimeInput}
                    maxLength={4}
                  />
                </View>
                <Text className="text-xs text-gray-500">
                  Cette donnée est enregistrée avec le check-in.
                </Text>
              </View>
            )}

            {loadingContext && (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator color="#6D28D9" size="small" />
                <Text className="text-xs text-gray-500">Synchronisation en cours...</Text>
              </View>
            )}
          </View>
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
