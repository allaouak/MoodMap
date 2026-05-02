import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/auth.store";
import { useMoodStore } from "@/stores/mood.store";
import { moodService } from "@/services/mood.service";
import { authService } from "@/services/auth.service";
import { TodayCard } from "@/features/mood/TodayCard";
import { MoodCheckIn } from "@/features/mood/MoodCheckIn";
import { MoodEntry } from "@/types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function TodayScreen() {
  const { user, profile, profileError, setProfile, setProfileError } = useAuthStore();
  const { todayEntry, setTodayEntry, isLoading, setLoading } = useMoodStore();
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const timezone = profile?.timezone ?? "UTC";

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const entry = await moodService.getTodayEntry(user.id, timezone);
      setTodayEntry(entry);
    } finally {
      setLoading(false);
    }
  }, [user, timezone, setTodayEntry, setLoading]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaved = (entry: MoodEntry) => {
    setTodayEntry(entry);
    setShowCheckIn(false);
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

  if (profileError) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.errorState}>
          <Text style={styles.errorEmoji}>⚠️</Text>
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
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.dateText}>{dateLabel}</Text>
          <Text style={styles.greeting}>Bonjour, {firstName} 🌿</Text>
        </View>

        {/* Contenu principal */}
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#6D28D9" />
          </View>
        ) : todayEntry ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ton ressenti du jour</Text>
            <TodayCard
              entry={todayEntry}
              onEdit={() => setShowCheckIn(true)}
            />
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🌱</Text>
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

        {todayEntry && !isLoading && (
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
  emptyEmoji: { fontSize: 56 },
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
  modalSafe: { flex: 1, backgroundColor: "#F8F4FF" },
  modalContent: { padding: 20, paddingBottom: 40 },

  errorState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  errorEmoji: { fontSize: 48 },
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
