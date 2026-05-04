import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import { fr } from "date-fns/locale";
import { useAuthStore } from "@/stores/auth.store";
import { moodService } from "@/services/mood.service";
import { contextualEntryService } from "@/services/contextual-entry.service";
import { MoodEntry, MOOD_COLOR, MOOD_LABELS } from "@/types";
import { MoodFaceIcon } from "@/components/mood/MoodFaceIcon";
import { AppIcon } from "@/components/ui/AppIcon";
import { formatTime } from "@/utils/date";
import { useQuery } from "@tanstack/react-query";
import {
  contextualEntryForDate,
  formatHoursFromMinutes,
  formatSleepDuration,
  hasContextualData,
} from "@/utils/contextual";

const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

function buildGrid(month: Date): Date[] {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  return eachDayOfInterval({ start: gridStart, end: gridEnd });
}

function entryForDay(entries: MoodEntry[], day: Date): MoodEntry | undefined {
  const key = format(day, "yyyy-MM-dd");
  return entries.find((e) => e.entry_date === key);
}

export default function CalendarScreen() {
  const { user } = useAuthStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selected, setSelected] = useState<Date | null>(null);

  const userId = user?.id;
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const fromDate = format(monthStart, "yyyy-MM-dd");
  const toDate = format(monthEnd, "yyyy-MM-dd");

  const { data: moodEntriesData, isLoading: isLoadingMood, error: moodError } = useQuery({
    queryKey: ['moodEntries', userId, fromDate, toDate],
    queryFn: () => {
      if (!userId) throw new Error("User not authenticated");
      return moodService.getEntries(userId, fromDate, toDate);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  const { data: contextualEntriesData, isLoading: isLoadingContextual, error: contextualError } = useQuery({
    queryKey: ['contextualEntries', userId, fromDate, toDate],
    queryFn: () => {
      if (!userId) throw new Error("User not authenticated");
      return contextualEntryService.getForDateRange(userId, fromDate, toDate);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  const loading = isLoadingMood || isLoadingContextual;
  const error = moodError || contextualError ? "Impossible de charger le calendrier. Vérifie ta connexion." : null;

  useEffect(() => {
    // Les données sont automatiquement chargées par useQuery lorsque currentMonth change
    setSelected(null);
  }, [currentMonth]);

  const days = buildGrid(currentMonth);
  const moodEntries = moodEntriesData ?? [];
  const contextualEntries = contextualEntriesData ?? [];
  const selectedEntry = selected ? entryForDay(moodEntries, selected) : undefined;
  const selectedContextual = selected
    ? contextualEntryForDate(contextualEntries, format(selected, "yyyy-MM-dd"))
    : undefined;

  const goToPrev = () => setCurrentMonth((m) => subMonths(m, 1));
  const goToNext = () => {
    const next = addMonths(currentMonth, 1);
    if (next <= new Date()) setCurrentMonth(next);
  };
  const canGoNext = addMonths(currentMonth, 1) <= new Date();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Calendrier</Text>
          <Text style={styles.pageSubtitle}>Retrouve tes ressentis et tes rythmes jour par jour.</Text>
        </View>

        {/* Header mois */}
        <View style={styles.calendarCard}>
          <View style={styles.monthHeader}>
            <TouchableOpacity
              onPress={goToPrev}
              style={styles.navBtn}
              activeOpacity={0.7}
              accessibilityLabel="Mois précédent"
              accessibilityRole="button"
            >
              <Text style={styles.navArrow} accessibilityElementsHidden>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthTitle}>
              {format(currentMonth, "MMMM yyyy", { locale: fr })}
            </Text>
            <TouchableOpacity
              onPress={goToNext}
              style={[styles.navBtn, !canGoNext && styles.navBtnDisabled]}
              activeOpacity={0.7}
              disabled={!canGoNext}
              accessibilityLabel="Mois suivant"
              accessibilityRole="button"
              accessibilityState={{ disabled: !canGoNext }}
            >
              <Text style={[styles.navArrow, !canGoNext && styles.navArrowDisabled]} accessibilityElementsHidden>›</Text>
            </TouchableOpacity>
          </View>

          {/* Labels jours de la semaine */}
          <View style={styles.dayLabels}>
            {DAY_LABELS.map((d, i) => (
              <View key={i} style={styles.dayLabelCell}>
                <Text style={styles.dayLabelText}>{d}</Text>
              </View>
            ))}
          </View>

          {/* Grille */}
          {loading ? (
            <View style={styles.loader}>
              <ActivityIndicator color="#6D28D9" />
            </View>
          ) : error ? (
            <View style={styles.loader}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {days.map((day) => {
                const entry = entryForDay(moodEntries, day);
                const inMonth = isSameMonth(day, currentMonth);
                const today = isToday(day);
                const isSelected = selected ? isSameDay(day, selected) : false;
                const color = entry ? MOOD_COLOR[entry.mood] : null;

                const a11yLabel = inMonth
                  ? `${format(day, "d MMMM", { locale: fr })}${entry ? `, humeur : ${MOOD_LABELS[entry.mood]}` : ", aucune entrée"}`
                  : undefined;

                return (
                  <TouchableOpacity
                    key={day.toISOString()}
                    style={[
                      styles.dayCell,
                      isSelected && styles.dayCellSelected,
                      today && !isSelected && styles.dayCellToday,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => setSelected(isSameDay(day, selected ?? new Date(0)) ? null : day)}
                    disabled={!inMonth}
                    accessibilityLabel={a11yLabel}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text
                      style={[
                        styles.dayNumber,
                        !inMonth && styles.dayNumberMuted,
                        today && styles.dayNumberToday,
                        isSelected && styles.dayNumberSelected,
                      ]}
                      accessibilityElementsHidden
                    >
                      {format(day, "d")}
                    </Text>
                    {color && inMonth ? (
                      <View
                        style={[styles.moodDot, { backgroundColor: color }]}
                        accessibilityElementsHidden
                      />
                    ) : (
                      <View style={styles.moodDotEmpty} accessibilityElementsHidden />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Légende */}
          <View style={styles.legend}>
            {([1, 2, 3, 4, 5] as const).map((level) => (
              <View key={level} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: MOOD_COLOR[level] }]} />
                <Text style={styles.legendLabel}>{MOOD_LABELS[level]}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Détail du jour sélectionné */}
        {selected && (
          <View style={styles.detailCard}>
            <Text style={styles.detailDate}>
              {format(selected, "EEEE d MMMM", { locale: fr })}
            </Text>
            {selectedEntry ? (
              <View style={styles.detailContent}>
                <View style={styles.detailMoodRow}>
                  <View
                    style={[
                      styles.detailMoodIcon,
                      { backgroundColor: MOOD_COLOR[selectedEntry.mood] + "20" },
                    ]}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  >
                    <MoodFaceIcon level={selectedEntry.mood} size={34} />
                  </View>
                  <View style={styles.detailMoodInfo}>
                    <Text style={styles.detailMoodLabel}>
                      {MOOD_LABELS[selectedEntry.mood]}
                    </Text>
                    <Text style={styles.detailTime}>
                      Enregistré à {formatTime(selectedEntry.created_at)}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailMetrics}>
                  <View style={styles.metricBadge}>
                    <Text style={styles.metricLabel}>Énergie</Text>
                    <Text style={[styles.metricValue, { color: "#60A5FA" }]}>
                      {selectedEntry.energy}/5
                    </Text>
                  </View>
                  <View style={styles.metricBadge}>
                    <Text style={styles.metricLabel}>Stress</Text>
                    <Text style={[styles.metricValue, { color: "#F97316" }]}>
                      {selectedEntry.stress}/5
                    </Text>
                  </View>
                </View>
                {selectedEntry.tags.length > 0 && (
                  <View style={styles.tags}>
                    {selectedEntry.tags.map((tag) => (
                      <View key={tag} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {selectedEntry.note && (
                  <Text style={styles.detailNote}>"{selectedEntry.note}"</Text>
                )}
                {hasContextualData(selectedContextual) && (
                  <View style={styles.contextBlock}>
                    <Text style={styles.contextTitle}>Données du jour</Text>
                    <View style={styles.contextChips}>
                      {selectedContextual?.sleep_duration_min != null && (
                        <View style={styles.contextChip}>
                          <AppIcon
                            name="moon-waning-crescent"
                            color="#6366F1"
                            backgroundColor="#EEF2FF"
                            size={13}
                            frameSize={24}
                          />
                          <Text style={styles.contextText}>
                            {formatSleepDuration(selectedContextual.sleep_duration_min)} sommeil
                          </Text>
                        </View>
                      )}
                      {selectedContextual?.activity_steps != null && (
                        <View style={styles.contextChip}>
                          <AppIcon
                            name="shoe-sneaker"
                            color="#059669"
                            backgroundColor="#ECFDF5"
                            size={13}
                            frameSize={24}
                          />
                          <Text style={styles.contextText}>
                            {selectedContextual.activity_steps.toLocaleString("fr-FR")} pas
                          </Text>
                        </View>
                      )}
                      {selectedContextual?.screen_total_min != null && (
                        <View style={styles.contextChip}>
                          <AppIcon
                            name="cellphone"
                            color="#0284C7"
                            backgroundColor="#E0F2FE"
                            size={13}
                            frameSize={24}
                          />
                          <Text style={styles.contextText}>
                            {formatHoursFromMinutes(selectedContextual.screen_total_min)} écran
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.detailEmptyState}>
                <AppIcon
                  name="calendar-blank-outline"
                  color="#9CA3AF"
                  backgroundColor="#F3F4F6"
                  size={20}
                  frameSize={42}
                />
                <Text style={styles.detailEmpty}>Pas d'entrée pour ce jour.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8F4FF" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 96, gap: 14 },

  header: { gap: 4, paddingHorizontal: 4 },
  pageTitle: { fontSize: 28, lineHeight: 34, fontWeight: "700", color: "#1F2937" },
  pageSubtitle: { fontSize: 13, color: "#9CA3AF", lineHeight: 20 },

  calendarCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 8,
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  navBtnDisabled: { opacity: 0.3 },
  navArrow: { fontSize: 28, lineHeight: 32, color: "#6D28D9", fontWeight: "300" },
  navArrowDisabled: { color: "#9CA3AF" },
  monthTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    textTransform: "capitalize",
  },

  dayLabels: { flexDirection: "row", marginTop: 6 },
  dayLabelCell: { flex: 1, alignItems: "center", paddingVertical: 2 },
  dayLabelText: { fontSize: 12, fontWeight: "600", color: "#9CA3AF" },

  loader: { paddingVertical: 60, alignItems: "center" },

  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: 0 },
  dayCell: {
    width: "14.285714%",
    height: 44,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 7,
    gap: 4,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  dayCellSelected: {
    backgroundColor: "#EDE5FF",
    borderColor: "#DDD1FF",
  },
  dayCellToday: {
    backgroundColor: "#FFFFFF",
    borderColor: "#C4B5FD",
  },
  dayNumber: { fontSize: 14, lineHeight: 20, fontWeight: "500", color: "#374151" },
  dayNumberMuted: { color: "#D1D5DB" },
  dayNumberToday: { color: "#6D28D9", fontWeight: "700" },
  dayNumberSelected: { color: "#6D28D9", fontWeight: "700" },
  moodDot: { width: 6, height: 6, borderRadius: 3, transform: [{ translateY: -4 }] },
  moodDotEmpty: { width: 6, height: 6, transform: [{ translateY: -4 }] },

  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
    alignSelf: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 0,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 7, height: 7, borderRadius: 3.5 },
  legendLabel: { fontSize: 10.5, color: "#6B7280", fontWeight: "500" },

  detailCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  detailDate: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6D28D9",
    textTransform: "capitalize",
  },
  detailContent: { gap: 12 },
  detailMoodRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  detailMoodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  detailMoodInfo: { gap: 2 },
  detailMoodLabel: { fontSize: 16, fontWeight: "700", color: "#1F2937" },
  detailTime: { fontSize: 12, color: "#9CA3AF" },
  detailMetrics: { flexDirection: "row", gap: 8 },
  metricBadge: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    gap: 2,
  },
  metricLabel: { fontSize: 11, color: "#9CA3AF", fontWeight: "500" },
  metricValue: { fontSize: 16, fontWeight: "700" },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: {
    backgroundColor: "#EDE5FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  tagText: { fontSize: 12, color: "#6D28D9", fontWeight: "500" },
  detailNote: {
    fontSize: 13,
    color: "#6B7280",
    fontStyle: "italic",
    lineHeight: 20,
  },
  contextBlock: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  contextTitle: { fontSize: 12, color: "#6B7280", fontWeight: "700", textTransform: "uppercase" },
  contextChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  contextChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  contextText: { fontSize: 12, color: "#374151", fontWeight: "600" },
  detailEmptyState: { alignItems: "center", gap: 8, paddingVertical: 10 },
  detailEmpty: { fontSize: 14, color: "#9CA3AF", textAlign: "center" },
  errorText: { fontSize: 14, color: "#EF4444", textAlign: "center", paddingHorizontal: 16 },
});
