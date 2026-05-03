import { useEffect, useState, useCallback, type ComponentProps } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Modal,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/auth.store";
import { useMoodStore } from "@/stores/mood.store";
import { useContextualStore } from "@/stores/contextual.store";
import { moodService } from "@/services/mood.service";
import { authService } from "@/services/auth.service";
import { contextualEntryService } from "@/services/contextual-entry.service";
import { TodayCard } from "@/features/mood/TodayCard";
import { MoodCheckIn } from "@/features/mood/MoodCheckIn";
import { AppIcon } from "@/components/ui/AppIcon";
import { MoodEntry } from "@/types";
import { ContextualEntry } from "@/types/contextual";
import { todayISOInTimezone } from "@/utils/date";
import { buildDailyContextSignal, type DailyContextSignal } from "@/utils/contextual";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const SIGNAL_STYLE: Record<
  DailyContextSignal["module"],
  { icon: ComponentProps<typeof AppIcon>["name"]; color: string; backgroundColor: string }
> = {
  sleep: { icon: "moon-waning-crescent", color: "#6366F1", backgroundColor: "#EEF2FF" },
  activity: { icon: "shoe-sneaker", color: "#059669", backgroundColor: "#ECFDF5" },
  screen_time: { icon: "cellphone", color: "#0284C7", backgroundColor: "#E0F2FE" },
};

function DailySignalCard({
  signal,
  onPress,
}: {
  signal: DailyContextSignal;
  onPress: () => void;
}) {
  const signalStyle = SIGNAL_STYLE[signal.module];

  return (
    <View style={styles.signalCard}>
      <View style={styles.signalHeader}>
        <AppIcon
          name={signalStyle.icon}
          color={signalStyle.color}
          backgroundColor={signalStyle.backgroundColor}
          size={18}
          frameSize={36}
        />
        <Text style={styles.signalTitle}>Signal du jour</Text>
      </View>
      <Text style={styles.signalText}>{signal.text}</Text>
      <TouchableOpacity style={styles.signalAction} onPress={onPress} activeOpacity={0.75}>
        <Text style={styles.signalActionText}>Voir les tendances</Text>
      </TouchableOpacity>
    </View>
  );
}

function ContextNudgeCard({
  hasEnabledContext,
  onSettingsPress,
  onEditPress,
}: {
  hasEnabledContext: boolean;
  onSettingsPress: () => void;
  onEditPress: () => void;
}) {
  return (
    <View style={styles.nudgeCard}>
      <View style={styles.signalHeader}>
        <AppIcon
          name={hasEnabledContext ? "sync" : "database-plus-outline"}
          color="#6D28D9"
          backgroundColor="#F3E8FF"
          size={18}
          frameSize={36}
        />
        <Text style={styles.signalTitle}>
          {hasEnabledContext ? "Données en attente" : "Enrichir ton journal"}
        </Text>
      </View>
      <Text style={styles.signalText}>
        {hasEnabledContext
          ? "Tes modules contextuels sont prêts. Ajoute ou resynchronise les données du jour pour obtenir un signal plus utile."
          : "Active le sommeil, l'activité ou le temps d'écran pour mieux comprendre ce qui accompagne ton ressenti."}
      </Text>
      <View style={styles.nudgeActions}>
        <TouchableOpacity
          style={styles.signalAction}
          onPress={hasEnabledContext ? onEditPress : onSettingsPress}
          activeOpacity={0.75}
        >
          <Text style={styles.signalActionText}>
            {hasEnabledContext ? "Compléter" : "Configurer"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function TodayScreen() {
  const router = useRouter();
  const { user, profile, profileError, setProfile, setProfileError } = useAuthStore();
  const { todayEntry, setTodayEntry, isLoading, setLoading } = useMoodStore();
  const consents = useContextualStore((state) => state.consents);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [todayContextualEntry, setTodayContextualEntry] = useState<ContextualEntry | null>(null);

  const timezone = profile?.timezone ?? "UTC";

  const load = useCallback(async (showGlobalLoader = true) => {
    if (!user) return;
    if (showGlobalLoader) setLoading(true);
    try {
      const today = todayISOInTimezone(timezone);
      const [entry, contextualEntry] = await Promise.all([
        moodService.getTodayEntry(user.id, timezone),
        contextualEntryService.getForDate(user.id, today),
      ]);
      setTodayEntry(entry);
      setTodayContextualEntry(contextualEntry);
    } finally {
      if (showGlobalLoader) setLoading(false);
    }
  }, [user, timezone, setTodayEntry, setLoading]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load(false);
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const handleSaved = async (entry: MoodEntry) => {
    setTodayEntry(entry);
    try {
      if (user) {
        const contextualEntry = await contextualEntryService.getForDate(
          user.id,
          todayISOInTimezone(timezone)
        );
        setTodayContextualEntry(contextualEntry);
      }
    } finally {
      setShowCheckIn(false);
    }
  };

  const handleRetryProfile = useCallback(async () => {
    if (!user) return;
    setRetrying(true);
    try {
      const p = await authService.getProfile(user.id);
      setProfile(p);
    } catch {
      setProfileError(true);
    } finally {
      setRetrying(false);
    }
  }, [user, setProfile, setProfileError]);

  const dateLabel = format(new Date(), "EEEE d MMMM", { locale: fr });
  const firstName = profile?.display_name?.split(" ")[0] ?? "toi";
  const dailySignal = todayEntry
    ? buildDailyContextSignal(todayEntry, todayContextualEntry)
    : null;
  const hasEnabledContext = Object.values(consents).some(Boolean);
  const showInitialLoader = isLoading && !todayEntry;

  if (profileError) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.errorState}>
          <AppIcon
            name="alert-circle-outline"
            color="#EF4444"
            backgroundColor="#FEE2E2"
            size={30}
            frameSize={58}
          />
          <Text style={styles.errorTitle}>Profil indisponible</Text>
          <Text style={styles.errorSubtitle}>
            Impossible de charger ton profil. Vérifie ta connexion.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetryProfile}
            activeOpacity={0.8}
            disabled={retrying}
          >
            {retrying ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.retryButtonText}>Réessayer</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#6D28D9"
            colors={["#6D28D9"]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.dateText}>{dateLabel}</Text>
          <View style={styles.greetingRow}>
            <Text style={styles.greeting}>Bonjour, {firstName}</Text>
            <AppIcon name="sprout-outline" size={19} frameSize={34} />
          </View>
        </View>

        {/* Contenu principal */}
        {showInitialLoader ? (
          <View style={styles.center}>
            <ActivityIndicator color="#6D28D9" />
          </View>
        ) : todayEntry ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ton ressenti du jour</Text>
            <TodayCard
              entry={todayEntry}
              contextualEntry={todayContextualEntry}
              onEdit={() => setShowCheckIn(true)}
            />
            {dailySignal && (
              <DailySignalCard
                signal={dailySignal}
                onPress={() => router.push("/(tabs)/insights")}
              />
            )}
            {!dailySignal && (
              <ContextNudgeCard
                hasEnabledContext={hasEnabledContext}
                onSettingsPress={() => router.push("/(tabs)/settings")}
                onEditPress={() => setShowCheckIn(true)}
              />
            )}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <AppIcon
              name="sprout-outline"
              color="#6D28D9"
              backgroundColor="#F3E8FF"
              size={32}
              frameSize={64}
            />
            <Text style={styles.emptyTitle}>
              Pas encore de check-in aujourd'hui
            </Text>
            <Text style={styles.emptySubtitle}>
              Prends 30 secondes pour noter comment tu te sens.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.8}
              onPress={() => setShowCheckIn(true)}
            >
              <Text style={styles.primaryButtonText}>
                Comment je me sens ?
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {todayEntry && !showInitialLoader && (
          <View style={styles.footer}>
            <Text style={styles.footerHint}>
              Tu peux mettre à jour ton ressenti jusqu'à minuit.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Modal check-in */}
      <Modal
        visible={showCheckIn}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCheckIn(false)}
      >
        <SafeAreaView style={styles.modalSafe} edges={["top"]}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
          >
            {user && (
              <MoodCheckIn
                userId={user.id}
                timezone={timezone}
                existingEntry={todayEntry}
                onSaved={handleSaved}
                onCancel={() => setShowCheckIn(false)}
              />
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8F4FF" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32, gap: 24 },
  header: { gap: 4 },
  dateText: { fontSize: 13, color: "#9CA3AF", textTransform: "capitalize" },
  greetingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  greeting: { fontSize: 26, fontWeight: "700", color: "#1F2937" },
  section: { gap: 12 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  center: { paddingVertical: 60, alignItems: "center" },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#1F2937", textAlign: "center" },
  emptySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 21,
    paddingHorizontal: 20,
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: "#6D28D9",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  footer: { alignItems: "center" },
  footerHint: { fontSize: 12, color: "#9CA3AF", textAlign: "center" },
  signalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    gap: 10,
  },
  nudgeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "#F3E8FF",
  },
  signalHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  signalTitle: { fontSize: 14, fontWeight: "700", color: "#1F2937" },
  signalText: { fontSize: 13, color: "#4B5563", lineHeight: 20 },
  signalAction: {
    alignSelf: "flex-start",
    backgroundColor: "#F3E8FF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  nudgeActions: { flexDirection: "row", alignItems: "center" },
  signalActionText: { fontSize: 12, fontWeight: "700", color: "#6D28D9" },
  modalSafe: { flex: 1, backgroundColor: "#F8F4FF" },
  modalContent: { padding: 20, paddingBottom: 40 },

  errorState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  errorTitle: { fontSize: 18, fontWeight: "700", color: "#1F2937", textAlign: "center" },
  errorSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 21,
  },
  retryButton: {
    marginTop: 8,
    backgroundColor: "#6D28D9",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
    minWidth: 120,
    alignItems: "center",
  },
  retryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
});
