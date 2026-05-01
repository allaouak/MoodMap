import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/useAuth";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";
import {
  notificationService,
  NotificationPrefs,
} from "@/services/notification.service";

const TIME_OPTIONS = [
  { label: "8h00", hour: 8, minute: 0 },
  { label: "12h00", hour: 12, minute: 0 },
  { label: "18h00", hour: 18, minute: 0 },
  { label: "20h00", hour: 20, minute: 0 },
  { label: "21h30", hour: 21, minute: 30 },
];

export default function SettingsScreen() {
  const { profile } = useAuth();
  const { reset } = useAuthStore();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    notificationService.getPrefs().then(setPrefs);
  }, []);

  const handleToggle = async (enabled: boolean) => {
    if (!prefs) return;
    const next = { ...prefs, enabled };
    setSaving(true);
    const ok = await notificationService.apply(next);
    setSaving(false);
    if (ok) {
      setPrefs(next);
    } else {
      Alert.alert(
        "Permission refusée",
        "Autorise les notifications dans les réglages iOS pour activer les rappels."
      );
    }
  };

  const handleTimeSelect = async (hour: number, minute: number) => {
    if (!prefs) return;
    const next = { ...prefs, hour, minute };
    setSaving(true);
    await notificationService.apply(next);
    setSaving(false);
    setPrefs(next);
  };

  const handleSignOut = () => {
    Alert.alert(
      "Se déconnecter",
      "Tu vas être déconnecté(e). Tes données restent sauvegardées.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Se déconnecter",
          style: "destructive",
          onPress: async () => {
            await notificationService.cancelAll();
            await authService.signOut();
            reset();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Réglages</Text>

        {/* Profil */}
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.display_name?.[0]?.toUpperCase() ?? "?"}
            </Text>
          </View>
          <Text style={styles.displayName}>
            {profile?.display_name ?? "Utilisateur"}
          </Text>
        </View>

        {/* Notifications */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Rappel quotidien</Text>
          {!prefs ? (
            <ActivityIndicator color="#6D28D9" style={{ paddingVertical: 12 }} />
          ) : (
            <>
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <Text style={styles.rowLabel}>Activer le rappel</Text>
                  <Text style={styles.rowSub}>
                    Une notification douce chaque jour
                  </Text>
                </View>
                <Switch
                  value={prefs.enabled}
                  onValueChange={handleToggle}
                  trackColor={{ false: "#E5E7EB", true: "#C4B5FD" }}
                  thumbColor={prefs.enabled ? "#6D28D9" : "#F9FAFB"}
                  disabled={saving}
                />
              </View>

              {prefs.enabled && (
                <View style={styles.timeSection}>
                  <Text style={styles.timeSectionLabel}>Heure du rappel</Text>
                  <View style={styles.timeOptions}>
                    {TIME_OPTIONS.map((opt) => {
                      const selected =
                        prefs.hour === opt.hour && prefs.minute === opt.minute;
                      return (
                        <TouchableOpacity
                          key={opt.label}
                          style={[
                            styles.timeChip,
                            selected && styles.timeChipSelected,
                          ]}
                          activeOpacity={0.7}
                          onPress={() =>
                            handleTimeSelect(opt.hour, opt.minute)
                          }
                          disabled={saving}
                        >
                          <Text
                            style={[
                              styles.timeChipText,
                              selected && styles.timeChipTextSelected,
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </>
          )}
        </View>

        {/* Confidentialité */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Confidentialité</Text>
          <Text style={styles.privacyText}>
            Tes données sont transmises via HTTPS et stockées dans une base
            sécurisée avec accès strictement limité à ton compte. MoodMap
            utilise Supabase comme hébergeur de données. Tu peux demander leur
            suppression à tout moment en contactant le support.
          </Text>
        </View>

        {/* Déconnexion */}
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={handleSignOut}
          activeOpacity={0.8}
        >
          <Text style={styles.signOutText}>Se déconnecter</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8F4FF" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40, gap: 16 },

  pageTitle: { fontSize: 26, fontWeight: "700", color: "#1F2937", paddingHorizontal: 4 },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    gap: 12,
  },

  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#EDE5FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 24, fontWeight: "700", color: "#6D28D9" },
  displayName: { fontSize: 18, fontWeight: "600", color: "#1F2937" },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rowLeft: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 15, fontWeight: "500", color: "#1F2937" },
  rowSub: { fontSize: 12, color: "#9CA3AF" },

  timeSection: { gap: 10, paddingTop: 4 },
  timeSectionLabel: { fontSize: 12, fontWeight: "600", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5 },
  timeOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  timeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  timeChipSelected: {
    backgroundColor: "#EDE5FF",
    borderColor: "#6D28D9",
  },
  timeChipText: { fontSize: 14, fontWeight: "600", color: "#6B7280" },
  timeChipTextSelected: { color: "#6D28D9" },

  privacyText: { fontSize: 13, color: "#6B7280", lineHeight: 20 },

  signOutBtn: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    alignItems: "center",
  },
  signOutText: { fontSize: 15, fontWeight: "600", color: "#EF4444" },
});
