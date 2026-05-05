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
import { checkInSchema } from "@moodmap/validation";

const MAX_TAGS = 10;

type CheckInForm = z.infer<typeof checkInSchema>;
type NativeContextModule = "sleep" | "activity";
type ContextSyncState = "idle" | "syncing" | "synced" | "empty" | "error";
type Step = 0 | 1 | 2;

interface ContextSyncStatus {
  state: ContextSyncState;
  detail: string;
}

const INITIAL_CONTEXT_STATUS: Record<NativeContextModule, ContextSyncStatus> = {
  sleep: { state: "idle", detail: "" },
  activity: { state: "idle", detail: "" },
};

const STEP_TITLES = [
  "Comment tu te sens ?",
  "Quelques mots ?",
  "Mon quotidien",
] as const;

const SUGGESTED_TAGS = [
  "travail", "famille", "sport", "repos", "social",
  "créativité", "nature", "lecture", "musique", "anxiété",
];

function sleepQualityFromMinutes(min: number): 1 | 2 | 3 | 4 | 5 {
  if (min >= 450) return 5;
  if (min >= 360) return 4;
  if (min >= 300) return 3;
  if (min >= 240) return 2;
  return 1;
}

function normalizeHHMM(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)/);
  return match ? `${match[1]}:${match[2]}` : null;
}

function minutesFromHHMM(value: string): number {
  const parts = value.split(":").map(Number);
  const hours = parts[0] ?? 0;
  const minutes = parts[1] ?? 0;
  return hours * 60 + minutes;
}

function sleepDurationFromTimes(bedtime: string, wakeTime: string): number {
  const bedtimeMin = minutesFromHHMM(bedtime);
  const wakeMin = minutesFromHHMM(wakeTime);
  const duration = wakeMin - bedtimeMin;
  return duration > 0 ? duration : duration + 24 * 60;
}

function isValidTimeComponent(h: string, m: string): boolean {
  const hour = parseInt(h, 10);
  const min = parseInt(m, 10);
  return !isNaN(hour) && !isNaN(min) && hour >= 0 && hour <= 23 && min >= 0 && min <= 59;
}

function contextStatusBg(state: ContextSyncState): string {
  if (state === "synced") return "bg-emerald-50 border-emerald-100";
  if (state === "empty") return "bg-amber-50 border-amber-100";
  if (state === "error") return "bg-red-50 border-red-100";
  return "bg-gray-50 border-gray-100";
}

function contextStatusText(state: ContextSyncState): string {
  if (state === "synced") return "text-emerald-700";
  if (state === "empty") return "text-amber-700";
  if (state === "error") return "text-red-700";
  return "text-gray-600";
}

function contextStatusLabel(state: ContextSyncState): string {
  if (state === "synced") return "Synchronisé";
  if (state === "syncing") return "Synchronisation";
  if (state === "empty") return "Aucune donnée";
  if (state === "error") return "À vérifier";
  return "En attente";
}

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

  const [step, setStep] = useState<Step>(0);
  const [loading, setLoading] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>(existingEntry?.tags ?? []);
  const [customTagInput, setCustomTagInput] = useState("");
  const [contextualEntry, setContextualEntry] = useState<ContextualEntry | null>(null);
  const [loadingContext, setLoadingContext] = useState(false);
  const [screenTimeInput, setScreenTimeInput] = useState("");

  // Split sleep time inputs : heure et minute séparés
  const [bedHour, setBedHour] = useState("23");
  const [bedMin, setBedMin] = useState("00");
  const [wakeHour, setWakeHour] = useState("07");
  const [wakeMin, setWakeMin] = useState("00");

  const [savingManualSleep, setSavingManualSleep] = useState(false);
  const [contextStatus, setContextStatus] =
    useState<Record<NativeContextModule, ContextSyncStatus>>(INITIAL_CONTEXT_STATUS);

  const hasAnyConsent = consents.sleep || consents.activity || consents.screen_time;
  const totalSteps: number = hasAnyConsent ? 3 : 2;
  const isLastStep = step === totalSteps - 1;
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
          updateContextStatus("sleep", { state: "syncing", detail: "Lecture de Santé…" });
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
          updateContextStatus("activity", { state: "syncing", detail: "Lecture de Santé…" });
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
        const bedtime = normalizeHHMM(entry.sleep_bedtime);
        const wakeTime = normalizeHHMM(entry.sleep_wake_time);
        if (bedtime) {
          const [h, m] = bedtime.split(":");
          setBedHour(h ?? "23");
          setBedMin(m ?? "00");
        }
        if (wakeTime) {
          const [h, m] = wakeTime.split(":");
          setWakeHour(h ?? "07");
          setWakeMin(m ?? "00");
        }
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

  const addCustomTag = () => {
    const tag = customTagInput.trim().toLowerCase();
    if (tag && !selectedTags.includes(tag) && selectedTags.length < MAX_TAGS) {
      setSelectedTags((prev) => [...prev, tag]);
    }
    setCustomTagInput("");
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
    if (!isValidTimeComponent(bedHour, bedMin) || !isValidTimeComponent(wakeHour, wakeMin)) {
      Alert.alert("Horaires invalides", "Saisis des heures entre 0–23 et des minutes entre 0–59.");
      return;
    }
    const bedtimeStr = `${bedHour.padStart(2, "0")}:${bedMin.padStart(2, "0")}`;
    const wakeStr = `${wakeHour.padStart(2, "0")}:${wakeMin.padStart(2, "0")}`;

    try {
      setSavingManualSleep(true);
      const durationMin = sleepDurationFromTimes(bedtimeStr, wakeStr);
      await contextualEntryService.saveSleep(userId, today, {
        duration_min: durationMin,
        bedtime: bedtimeStr,
        wake_time: wakeStr,
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

  const customTags = selectedTags.filter((t) => !SUGGESTED_TAGS.includes(t));

  return (
    <View className="bg-white rounded-3xl p-5 gap-5" testID="check-in-form">
      {/* Indicateur de progression */}
      <View className="flex-row gap-1.5">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <View
            key={i}
            className="flex-1 h-1 rounded-full"
            style={{ backgroundColor: i <= step ? "#6D28D9" : "#E5E7EB" }}
          />
        ))}
      </View>

      <Text className="text-lg font-bold text-gray-900">
        {step === 0 && existingEntry ? "Modifier mon ressenti" : STEP_TITLES[step]}
      </Text>

      {/* ─── Étape 0 : Ressenti ─── */}
      {step === 0 && (
        <View className="gap-6">
          <Controller
            control={control}
            name="mood"
            render={({ field: { value, onChange } }) => (
              <MoodSlider
                label="Humeur"
                value={value as MoodLevel}
                onChange={onChange}
                emoji
                testIDPrefix="check-in-mood"
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
                anchors={["Épuisé", "Débordant"]}
                testIDPrefix="check-in-energy"
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
                anchors={["Zen", "Débordé"]}
                testIDPrefix="check-in-stress"
              />
            )}
          />
        </View>
      )}

      {/* ─── Étape 1 : Contexte (tags + note) ─── */}
      {step === 1 && (
        <View className="gap-5">
          {/* Tags suggérés */}
          <View className="gap-3">
            <Text className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
              Contexte
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {SUGGESTED_TAGS.map((tag) => {
                const selected = selectedTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    onPress={() => toggleTag(tag)}
                    testID={`check-in-tag-${tag}`}
                    className={`px-3 py-1.5 rounded-full border ${
                      selected ? "bg-brand-500 border-brand-500" : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <Text className={`text-sm font-medium ${selected ? "text-white" : "text-gray-500"}`}>
                      {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Tags personnalisés déjà ajoutés */}
            {customTags.length > 0 && (
              <View className="flex-row flex-wrap gap-2">
                {customTags.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    onPress={() => toggleTag(tag)}
                    className="flex-row items-center gap-1 px-3 py-1.5 rounded-full bg-brand-500 border border-brand-500"
                  >
                    <Text className="text-sm font-medium text-white">{tag}</Text>
                    <Text className="text-white text-xs font-bold"> ×</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Input tag personnalisé */}
            <View className="flex-row gap-2 items-center">
              <TextInput
                className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700"
                placeholder={`Ajouter un tag… (${selectedTags.length}/${MAX_TAGS})`}
                placeholderTextColor="#9CA3AF"
                value={customTagInput}
                onChangeText={setCustomTagInput}
                onSubmitEditing={addCustomTag}
                testID="check-in-custom-tag-input"
                returnKeyType="done"
                maxLength={30}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {customTagInput.trim().length > 0 && (
                <TouchableOpacity
                  onPress={addCustomTag}
                  testID="check-in-add-custom-tag"
                  className="w-8 h-8 bg-brand-500 rounded-full items-center justify-center"
                >
                  <Text className="text-white text-lg font-bold leading-none">+</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Note libre */}
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
                  placeholder="Quelques mots sur ta journée… (optionnel)"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  textAlignVertical="top"
                  value={value}
                  onChangeText={onChange}
                  testID="check-in-note-input"
                  maxLength={500}
                />
                <Text className="text-xs text-gray-400 text-right">
                  {(value ?? "").length}/500
                </Text>
              </View>
            )}
          />
        </View>
      )}

      {/* ─── Étape 2 : Mon quotidien (contextuel) ─── */}
      {step === 2 && hasAnyConsent && (
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Données du jour
            </Text>
            <TouchableOpacity
              onPress={syncContext}
              disabled={loadingContext}
              className={`px-3 py-1.5 rounded-full ${loadingContext ? "bg-gray-100" : "bg-brand-50"}`}
            >
              <Text className={`text-xs font-semibold ${loadingContext ? "text-gray-400" : "text-brand-700"}`}>
                Resynchroniser
              </Text>
            </TouchableOpacity>
          </View>

          <View className="gap-2">
            {/* Sommeil */}
            {consents.sleep && (
              <View className={`border rounded-2xl px-3 py-3 gap-1 ${contextStatusBg(contextStatus.sleep.state)}`}>
                <View className="flex-row items-center justify-between gap-3">
                  <Text className="text-sm font-semibold text-gray-900">Sommeil</Text>
                  <Text className={`text-xs font-semibold ${contextStatusText(contextStatus.sleep.state)}`}>
                    {contextStatusLabel(contextStatus.sleep.state)}
                  </Text>
                </View>
                <Text className={`text-xs leading-5 ${contextStatusText(contextStatus.sleep.state)}`}>
                  {contextStatus.sleep.detail || "Autorisé, prêt à synchroniser"}
                </Text>
                {contextualEntry?.sleep_duration_min != null && (
                  <View className="gap-1">
                    <Text className="text-xs text-gray-600">
                      Durée {formatSleepDuration(contextualEntry.sleep_duration_min)}
                    </Text>
                    <Text className="text-xs text-gray-500">
                      Coucher {normalizeHHMM(contextualEntry.sleep_bedtime) ?? "--:--"} · Réveil{" "}
                      {normalizeHHMM(contextualEntry.sleep_wake_time) ?? "--:--"}
                    </Text>
                  </View>
                )}

                {/* Saisie manuelle du sommeil — inputs HH et MM séparés */}
                {(contextStatus.sleep.state === "empty" ||
                  contextStatus.sleep.state === "error" ||
                  contextualEntry?.sleep_source === "manual") && (
                  <View className="gap-2 pt-2">
                    <Text className="text-xs font-semibold text-gray-600">Saisie manuelle</Text>
                    <Text className="text-xs text-gray-500">
                      La durée est calculée automatiquement depuis les horaires.
                    </Text>
                    <View className="flex-row gap-4">
                      {/* Heure de coucher */}
                      <View className="gap-1">
                        <Text className="text-xs text-gray-500">Coucher</Text>
                        <View className="flex-row items-center bg-white rounded-xl px-2">
                          <TextInput
                            className="w-9 py-2 text-base text-gray-900 text-center"
                            placeholder="23"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="numeric"
                            value={bedHour}
                            onChangeText={(t) => setBedHour(t.replace(/\D/g, "").slice(0, 2))}
                            maxLength={2}
                          />
                          <Text className="text-gray-400 font-bold">:</Text>
                          <TextInput
                            className="w-9 py-2 text-base text-gray-900 text-center"
                            placeholder="00"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="numeric"
                            value={bedMin}
                            onChangeText={(t) => setBedMin(t.replace(/\D/g, "").slice(0, 2))}
                            maxLength={2}
                          />
                        </View>
                      </View>

                      {/* Heure de réveil */}
                      <View className="gap-1">
                        <Text className="text-xs text-gray-500">Réveil</Text>
                        <View className="flex-row items-center bg-white rounded-xl px-2">
                          <TextInput
                            className="w-9 py-2 text-base text-gray-900 text-center"
                            placeholder="07"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="numeric"
                            value={wakeHour}
                            onChangeText={(t) => setWakeHour(t.replace(/\D/g, "").slice(0, 2))}
                            maxLength={2}
                          />
                          <Text className="text-gray-400 font-bold">:</Text>
                          <TextInput
                            className="w-9 py-2 text-base text-gray-900 text-center"
                            placeholder="00"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="numeric"
                            value={wakeMin}
                            onChangeText={(t) => setWakeMin(t.replace(/\D/g, "").slice(0, 2))}
                            maxLength={2}
                          />
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={saveManualSleep}
                      disabled={savingManualSleep}
                      className={`self-start px-3 py-2 rounded-full ${
                        savingManualSleep ? "bg-gray-100" : "bg-amber-100"
                      }`}
                    >
                      <Text className={`text-xs font-semibold ${savingManualSleep ? "text-gray-400" : "text-amber-800"}`}>
                        {savingManualSleep ? "Enregistrement…" : "Enregistrer le sommeil"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Activité physique */}
            {consents.activity && (
              <View className={`border rounded-2xl px-3 py-3 gap-1 ${contextStatusBg(contextStatus.activity.state)}`}>
                <View className="flex-row items-center justify-between gap-3">
                  <Text className="text-sm font-semibold text-gray-900">Activité physique</Text>
                  <Text className={`text-xs font-semibold ${contextStatusText(contextStatus.activity.state)}`}>
                    {contextStatusLabel(contextStatus.activity.state)}
                  </Text>
                </View>
                <Text className={`text-xs leading-5 ${contextStatusText(contextStatus.activity.state)}`}>
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

            {/* Temps d'écran */}
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
                    testID="check-in-screen-time-input"
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
                <Text className="text-xs text-gray-500">Synchronisation en cours…</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Navigation */}
      <View className="gap-2">
        <Button
          label={isLastStep ? (existingEntry ? "Mettre à jour" : "Enregistrer") : "Suivant"}
          loading={isLastStep ? loading : false}
          onPress={isLastStep ? handleSubmit(onSubmit) : () => setStep((s) => (s + 1) as Step)}
          testID={isLastStep ? "check-in-submit" : "check-in-next"}
        />
        {(step > 0 || onCancel) && (
          <Button
            label={step === 0 ? "Annuler" : "Retour"}
            variant="ghost"
            onPress={step === 0 ? onCancel : () => setStep((s) => (s - 1) as Step)}
            testID={step === 0 ? "check-in-cancel" : "check-in-back"}
          />
        )}
      </View>
    </View>
  );
}
