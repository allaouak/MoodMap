import { useEffect, useState, type ComponentProps } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  Share,
} from "react-native";
import * as Sharing from "expo-sharing";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/useAuth";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";
import {
  notificationService,
  NotificationPrefs,
} from "@/services/notification.service";
import { biometricService } from "@/services/biometric.service";
import { useContextualStore } from "@/stores/contextual.store";
import { contextualConsentService } from "@/services/contextual-consent.service";
import { sleepService } from "@/services/sleep.service";
import { activityService } from "@/services/activity.service";
import { dataExportService } from "@/services/data-export.service";
import type { ContextualModule } from "@/types/contextual";
import { AppIcon } from "@/components/ui/AppIcon";
import { ChangePasswordForm } from "@/features/auth/ChangePasswordForm";
import { isExpoGo } from "@/utils/runtime";

const TIME_PRESETS = [
  { label: "8h00", hour: 8, minute: 0 },
  { label: "12h00", hour: 12, minute: 0 },
  { label: "18h00", hour: 18, minute: 0 },
  { label: "20h00", hour: 20, minute: 0 },
  { label: "21h30", hour: 21, minute: 30 },
];

const MODULE_LABEL: Record<ContextualModule, string> = {
  sleep: "Sommeil",
  activity: "Activité physique",
  screen_time: "Temps d'écran",
};

const MODULE_DESC: Record<ContextualModule, string> = {
  sleep: "Durée et heure de réveil depuis l'app Santé",
  activity: "Pas et minutes actives depuis l'app Santé",
  screen_time: "Saisie manuelle lors du check-in",
};

const MODULE_EXPLAIN: Record<ContextualModule, string> = {
  sleep: "MoodMap va lire tes données de sommeil depuis l'app Santé pour enrichir ton journal. Ces données restent sur ton compte et ne sont jamais partagées.",
  activity: "MoodMap va lire ton nombre de pas et tes minutes d'activité depuis l'app Santé. Ces données restent sur ton compte et ne sont jamais partagées.",
  screen_time: "Tu pourras saisir ton temps d'écran manuellement lors de chaque check-in. Aucun accès aux apps ou à l'historique n'est demandé.",
};

const MODULE_ICON: Record<ContextualModule, ComponentProps<typeof AppIcon>["name"]> = {
  sleep: "moon-waning-crescent",
  activity: "shoe-sneaker",
  screen_time: "cellphone",
};

const MODULE_COLOR: Record<ContextualModule, { color: string; backgroundColor: string }> = {
  sleep: { color: "#6366F1", backgroundColor: "#EEF2FF" },
  activity: { color: "#059669", backgroundColor: "#ECFDF5" },
  screen_time: { color: "#0284C7", backgroundColor: "#E0F2FE" },
};

const NATIVE_HEALTH_MODULES: ContextualModule[] = ["sleep", "activity"];

function SectionHeader({
  icon,
  title,
  color = "#6D28D9",
  backgroundColor = "#F3E8FF",
}: {
  icon: ComponentProps<typeof AppIcon>["name"];
  title: string;
  color?: string;
  backgroundColor?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <AppIcon
        name={icon}
        color={color}
        backgroundColor={backgroundColor}
        size={16}
        frameSize={30}
      />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const { profile, session, user, setProfile } = useAuth();
  const queryClient = useQueryClient();
  const { reset, setLockEnabled: setGlobalLockEnabled } = useAuthStore();
  const { consents, setConsent } = useContextualStore();
  const [consentSaving, setConsentSaving] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [saving, setSaving] = useState(false);
  const [lockEnabled, setLockEnabled] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [deleteStep, setDeleteStep] = useState<"idle" | "otp">("idle");
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [editNameVisible, setEditNameVisible] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const [editNameLoading, setEditNameLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [customHour, setCustomHour] = useState("");
  const [customMin, setCustomMin] = useState("");
  const nativeHealthUnavailable = isExpoGo();

  const invalidateContextualQueries = async () => {
    if (!user) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["todayContextualEntry", user.id] }),
      queryClient.invalidateQueries({ queryKey: ["contextualEntries", user.id] }),
    ]);
  };

  const updateProfileMutation = useMutation({
    mutationFn: (newName: string) => {
      if (!user) throw new Error("No user");
      return authService.updateProfile(user.id, { display_name: newName });
    },
    onSuccess: (updatedProfile) => {
      setProfile(updatedProfile);
      setEditNameVisible(false);
    },
  });

  useEffect(() => {
    notificationService.getPrefs().then((p) => {
      setPrefs(p);
      setCustomHour(String(p.hour));
      setCustomMin(String(p.minute).padStart(2, "0"));
    });
    biometricService.isSupported().then(setBiometricSupported);
    biometricService.getLockEnabled().then(setLockEnabled);
  }, []);

  const handleEditName = () => {
    setEditNameValue(profile?.display_name ?? "");
    setEditNameVisible(true);
  };

  const handleSaveName = async () => {
    const trimmed = editNameValue.trim();
    if (!trimmed || !user) return;
    setEditNameLoading(true);
    try {
      await updateProfileMutation.mutateAsync(trimmed);
    } catch {
      Alert.alert("Erreur", "Impossible de mettre à jour le nom. Réessaie.");
    } finally {
      setEditNameLoading(false);
    }
  };

  const handleLockToggle = async (enabled: boolean) => {
    if (enabled) {
      const ok = await biometricService.authenticate();
      if (!ok) return;
    }
    try {
      await biometricService.setLockEnabled(enabled);
      setLockEnabled(enabled);
      setGlobalLockEnabled(enabled);
    } catch {
      Alert.alert("Erreur", "Impossible de modifier le verrou. Réessaie.");
    }
  };

  const handleToggle = async (enabled: boolean) => {
    if (!prefs) return;
    const next = { ...prefs, enabled };
    setSaving(true);
    try {
      const ok = await notificationService.apply(next);
      if (ok) {
        setPrefs(next);
      } else {
        Alert.alert(
          "Permission refusée",
          "Autorise les notifications dans les réglages iOS pour activer les rappels."
        );
      }
    } catch {
      Alert.alert("Erreur", "Impossible de modifier les notifications. Réessaie.");
    } finally {
      setSaving(false);
    }
  };

  const handleConsentToggle = async (module: ContextualModule, enabled: boolean) => {
    if (!user) return;
    if (enabled && nativeHealthUnavailable && NATIVE_HEALTH_MODULES.includes(module)) {
      Alert.alert(
        "Development build requise",
        "Ce module utilise une API santé native qui n'est pas disponible dans Expo Go."
      );
      return;
    }

    if (enabled) {
      Alert.alert(
        `Activer : ${MODULE_LABEL[module]}`,
        MODULE_EXPLAIN[module],
        [
          { text: "Annuler", style: "cancel" },
          {
            text: "Autoriser",
            onPress: async () => {
              setConsentSaving(true);
              try {
                if (module === "sleep") {
                  const ok = await sleepService.requestPermission();
                  if (!ok) {
                    Alert.alert(
                      "Module indisponible",
                      isExpoGo()
                        ? "Le sommeil nécessite une development build Expo, car HealthKit n'est pas disponible dans Expo Go."
                        : "Autorise l'accès dans les réglages de l'app Santé."
                    );
                    return;
                  }
                } else if (module === "activity") {
                  const ok = await activityService.requestPermission();
                  if (!ok) {
                    Alert.alert(
                      "Module indisponible",
                      isExpoGo()
                        ? "L'activité physique nécessite une development build Expo, car les APIs santé natives ne sont pas disponibles dans Expo Go."
                        : "Autorise l'accès dans les réglages de l'app Santé."
                    );
                    return;
                  }
                }
                await contextualConsentService.setConsent(user.id, module, true);
                setConsent(module, true);
                await invalidateContextualQueries();
              } catch {
                Alert.alert("Erreur", "Impossible d'activer ce module. Réessaie.");
              } finally {
                setConsentSaving(false);
              }
            },
          },
        ]
      );
    } else {
      Alert.alert(
        `Désactiver : ${MODULE_LABEL[module]}`,
        "Veux-tu aussi supprimer les données déjà enregistrées ?",
        [
          {
            text: "Garder les données",
            onPress: async () => {
              setConsentSaving(true);
              try {
                await contextualConsentService.setConsent(user.id, module, false);
                setConsent(module, false);
                await invalidateContextualQueries();
              } catch {
                Alert.alert("Erreur", "Impossible de désactiver ce module. Réessaie.");
              } finally {
                setConsentSaving(false);
              }
            },
          },
          {
            text: "Supprimer les données",
            style: "destructive",
            onPress: async () => {
              setConsentSaving(true);
              try {
                await contextualConsentService.setConsent(user.id, module, false);
                await contextualConsentService.deleteModuleData(user.id, module);
                setConsent(module, false);
                await invalidateContextualQueries();
              } catch {
                Alert.alert("Erreur", "Impossible de désactiver ce module. Réessaie.");
              } finally {
                setConsentSaving(false);
              }
            },
          },
        ]
      );
    }
  };

  const handleTimeSelect = async (hour: number, minute: number) => {
    if (!prefs) return;
    const next = { ...prefs, hour, minute };
    setSaving(true);
    try {
      await notificationService.apply(next);
      setPrefs(next);
      setCustomHour(String(hour));
      setCustomMin(String(minute).padStart(2, "0"));
    } catch {
      Alert.alert("Erreur", "Impossible de mettre à jour l'heure. Réessaie.");
    } finally {
      setSaving(false);
    }
  };

  const applyCustomTime = async () => {
    const h = parseInt(customHour, 10);
    const m = parseInt(customMin, 10);
    if (isNaN(h) || h < 0 || h > 23) {
      Alert.alert("Heure invalide", "L'heure doit être comprise entre 0 et 23.");
      return;
    }
    if (isNaN(m) || m < 0 || m > 59) {
      Alert.alert("Minutes invalides", "Les minutes doivent être comprises entre 0 et 59.");
      return;
    }
    await handleTimeSelect(h, m);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Supprimer mon compte",
      "Toutes tes données (humeurs, journal, profil) seront définitivement supprimées. Cette action est irréversible.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Continuer",
          style: "destructive",
          onPress: () => {
            setOtpCode("");
            setDeleteStep("otp");
          },
        },
      ]
    );
  };

  const handleExportData = async () => {
    if (!user) return;
    setExportLoading(true);
    let fileUri: string | null = null;
    try {
      const email = session?.user?.email ?? null;
      const canShareFile = await Sharing.isAvailableAsync();

      if (canShareFile) {
        fileUri = await dataExportService.writeExportFile(user.id, email);
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/json",
          dialogTitle: "Exporter mes données MoodMap",
          UTI: "public.json",
        });
      } else {
        const json = await dataExportService.buildExportJson(user.id, email);
        await Share.share({
          title: "Export MoodMap",
          message: json,
        });
      }
    } catch {
      Alert.alert("Erreur", "Impossible de préparer l'export de tes données. Réessaie.");
    } finally {
      if (fileUri) dataExportService.deleteExportFile(fileUri);
      setExportLoading(false);
    }
  };

  const handleVerifyAndDelete = async () => {
    const email = session?.user?.email;
    if (!email || !otpCode.trim()) return;
    setOtpLoading(true);

    // Étape 1 : ré-authentification — échec ici = mot de passe incorrect, on s'arrête
    try {
      await authService.confirmPassword(email, otpCode.trim());
    } catch {
      Alert.alert("Mot de passe incorrect", "Vérifie ton mot de passe et réessaie.");
      setOtpLoading(false);
      return;
    }

    // Étape 2 : nettoyage + suppression — reset() uniquement après succès serveur confirmé
    try {
      try {
        await notificationService.cancelAll();
      } catch {
        // Non bloquant — on continue la suppression même si les notifs ne se cancellent pas
      }
      await authService.deleteAccount();
      // Succès confirmé : on nettoie l'état local
      setDeleteStep("idle");
      reset();
    } catch {
      Alert.alert("Erreur", "La suppression a échoué côté serveur. Réessaie ou contacte le support.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handlePasswordChangeSuccess = () => {
    Alert.alert(
      "Mot de passe mis à jour",
      "Ton mot de passe a été changé avec succès."
    );
  };

  const handlePasswordChangeCancel = () => {
    // Ne rien faire, l'utilisateur a annulé
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
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {profile?.display_name?.[0]?.toUpperCase() ?? "?"}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.displayName}>
                {profile?.display_name ?? "Utilisateur"}
              </Text>
              <Text style={styles.profileEmail}>{session?.user?.email}</Text>
            </View>
            <TouchableOpacity
              style={styles.editNameBtn}
              onPress={handleEditName}
              activeOpacity={0.7}
            >
              <Text style={styles.editNameBtnText}>Modifier</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.card}>
          <SectionHeader icon="bell-outline" title="Rappel quotidien" />
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
                  <Text style={styles.timeSectionLabel}>Raccourcis</Text>
                  <View style={styles.timeOptions}>
                    {TIME_PRESETS.map((opt) => {
                      const selected =
                        prefs.hour === opt.hour && prefs.minute === opt.minute;
                      return (
                        <TouchableOpacity
                          key={opt.label}
                          style={[styles.timeChip, selected && styles.timeChipSelected]}
                          activeOpacity={0.7}
                          onPress={() => handleTimeSelect(opt.hour, opt.minute)}
                          disabled={saving}
                        >
                          <Text style={[styles.timeChipText, selected && styles.timeChipTextSelected]}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={styles.timeSectionLabel}>Heure personnalisée</Text>
                  <View style={styles.customTimeRow}>
                    <TextInput
                      style={styles.customTimeInput}
                      value={customHour}
                      onChangeText={(t) => setCustomHour(t.replace(/\D/g, "").slice(0, 2))}
                      keyboardType="numeric"
                      maxLength={2}
                      placeholder="HH"
                      placeholderTextColor="#D1D5DB"
                    />
                    <Text style={styles.customTimeSep}>:</Text>
                    <TextInput
                      style={styles.customTimeInput}
                      value={customMin}
                      onChangeText={(t) => setCustomMin(t.replace(/\D/g, "").slice(0, 2))}
                      keyboardType="numeric"
                      maxLength={2}
                      placeholder="MM"
                      placeholderTextColor="#D1D5DB"
                    />
                    <TouchableOpacity
                      style={[styles.customTimeApply, saving && styles.actionDisabled]}
                      onPress={applyCustomTime}
                      disabled={saving}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.customTimeApplyText}>Définir</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}
        </View>

        {/* Verrouillage biométrique */}
        <View style={styles.card}>
          <SectionHeader icon="shield-lock-outline" title="Sécurité" />
          {biometricSupported ? (
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowLabel}>Verrouillage Face ID</Text>
                <Text style={styles.rowSub}>
                  Protège l'accès à ton journal
                </Text>
              </View>
              <Switch
                value={lockEnabled}
                onValueChange={handleLockToggle}
                trackColor={{ false: "#E5E7EB", true: "#C4B5FD" }}
                thumbColor={lockEnabled ? "#6D28D9" : "#F9FAFB"}
              />
            </View>
          ) : (
            <Text style={styles.rowSub}>
              Face ID ou Touch ID non disponible sur cet appareil.
            </Text>
          )}
          
          <View style={styles.separator} />
          
          <ChangePasswordForm 
            userEmail={session?.user?.email ?? ""} 
            onSuccess={handlePasswordChangeSuccess} 
            onCancel={handlePasswordChangeCancel} 
          />
        </View>

        {/* Mon quotidien */}
        <View style={styles.card}>
          <SectionHeader icon="database-outline" title="Mon quotidien" />
          <Text style={styles.contextualIntro}>
            Enrichis ton journal avec des données de ton quotidien. Chaque module est indépendant et révocable.
          </Text>
          {(["sleep", "activity", "screen_time"] as ContextualModule[]).map((module) => (
            <View key={module} style={styles.contextualRow}>
              <View style={styles.moduleInfo}>
                <AppIcon
                  name={MODULE_ICON[module]}
                  color={MODULE_COLOR[module].color}
                  backgroundColor={MODULE_COLOR[module].backgroundColor}
                  size={17}
                  frameSize={34}
                />
                <View style={styles.rowLeft}>
                  <View style={styles.moduleTitleRow}>
                    <Text style={styles.rowLabel}>{MODULE_LABEL[module]}</Text>
                    {nativeHealthUnavailable && NATIVE_HEALTH_MODULES.includes(module) && (
                      <View style={styles.moduleBadge}>
                        <Text style={styles.moduleBadgeText}>Dev build</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.rowSub}>{MODULE_DESC[module]}</Text>
                  {nativeHealthUnavailable && NATIVE_HEALTH_MODULES.includes(module) && (
                    <Text style={styles.moduleUnavailableText}>
                      Non disponible dans Expo Go.
                    </Text>
                  )}
                </View>
              </View>
              <Switch
                value={consents[module]}
                onValueChange={(v) => handleConsentToggle(module, v)}
                trackColor={{ false: "#E5E7EB", true: "#C4B5FD" }}
                thumbColor={consents[module] ? "#6D28D9" : "#F9FAFB"}
                disabled={
                  consentSaving ||
                  (nativeHealthUnavailable && NATIVE_HEALTH_MODULES.includes(module))
                }
              />
            </View>
          ))}
        </View>

        {/* Confidentialité */}
        <View style={styles.card}>
          <SectionHeader icon="lock-check-outline" title="Confidentialité" />
          <Text style={styles.privacyText}>
            Tes données sont transmises via HTTPS et stockées dans une base
            sécurisée avec accès strictement limité à ton compte. MoodMap
            utilise Supabase comme hébergeur de données. Tu peux supprimer ton
            compte et toutes tes données via le bouton de suppression ci-dessous.
          </Text>
          <TouchableOpacity
            style={[styles.exportBtn, exportLoading && styles.actionDisabled]}
            onPress={handleExportData}
            activeOpacity={0.8}
            disabled={exportLoading}
          >
            {exportLoading ? (
              <ActivityIndicator color="#6D28D9" size="small" />
            ) : (
              <>
                <AppIcon
                  name="download-outline"
                  color="#6D28D9"
                  backgroundColor="#EDE5FF"
                  size={18}
                  frameSize={34}
                />
                <View style={styles.exportTextBlock}>
                  <Text style={styles.exportBtnLabel}>Exporter mes données</Text>
                  <Text style={styles.exportBtnSub}>Profil, humeurs et données contextuelles au format JSON</Text>
                </View>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Déconnexion */}
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={handleSignOut}
          activeOpacity={0.8}
        >
          <Text style={styles.signOutText}>Se déconnecter</Text>
        </TouchableOpacity>

        {/* Suppression de compte (RGPD) */}
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={handleDeleteAccount}
          activeOpacity={0.8}
        >
          <Text style={styles.deleteBtnLabel}>Supprimer mon compte</Text>
          <Text style={styles.deleteBtnSub}>
            Efface définitivement toutes tes données
          </Text>
        </TouchableOpacity>
      </ScrollView>
      <Modal
        visible={deleteStep === "otp"}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteStep("idle")}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirme ta suppression</Text>
            <Text style={styles.modalSub}>
              Saisis ton mot de passe pour confirmer la suppression définitive de{" "}
              <Text style={styles.modalEmail}>{session?.user?.email}</Text>
            </Text>
            <TextInput
              style={styles.otpInput}
              value={otpCode}
              onChangeText={setOtpCode}
              placeholder="Mot de passe"
              placeholderTextColor="#D1D5DB"
              secureTextEntry
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setDeleteStep("idle")}
                disabled={otpLoading}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  (!otpCode.trim() || otpLoading) && styles.modalBtnDisabled,
                ]}
                onPress={handleVerifyAndDelete}
                disabled={!otpCode.trim() || otpLoading}
              >
                {otpLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>Supprimer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={editNameVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditNameVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Modifier le nom</Text>
            <TextInput
              style={styles.nameInput}
              value={editNameValue}
              onChangeText={setEditNameValue}
              placeholder="Ton prénom ou pseudonyme"
              placeholderTextColor="#D1D5DB"
              autoFocus
              maxLength={50}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEditNameVisible(false)}
                disabled={editNameLoading}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  styles.modalConfirmBtnPrimary,
                  (!editNameValue.trim() || editNameLoading) && styles.modalBtnDisabled,
                ]}
                onPress={handleSaveName}
                disabled={!editNameValue.trim() || editNameLoading}
              >
                {editNameLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>Enregistrer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8F4FF" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40, gap: 16 },

  pageTitle: { fontSize: 28, lineHeight: 34, fontWeight: "700", color: "#1F2937", paddingHorizontal: 4 },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    gap: 12,
  },

  profileRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  profileInfo: { flex: 1, gap: 2 },
  profileEmail: { fontSize: 12, color: "#9CA3AF" },
  editNameBtn: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  editNameBtnText: { fontSize: 13, fontWeight: "600", color: "#6D28D9" },

  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#EDE5FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 24, fontWeight: "700", color: "#6D28D9" },
  displayName: { fontSize: 16, fontWeight: "600", color: "#1F2937" },

  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
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
  contextualRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 54,
  },
  moduleInfo: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  rowLeft: { flex: 1, gap: 2 },
  moduleTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowLabel: { fontSize: 15, fontWeight: "500", color: "#1F2937" },
  rowSub: { fontSize: 12, color: "#9CA3AF" },
  moduleBadge: {
    backgroundColor: "#FEF3C7",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  moduleBadgeText: { fontSize: 10, color: "#92400E", fontWeight: "700" },
  moduleUnavailableText: { fontSize: 11, color: "#B45309", fontWeight: "500" },

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

  contextualIntro: { fontSize: 13, color: "#6B7280", lineHeight: 20, marginTop: -4 },

  privacyText: { fontSize: 13, color: "#6B7280", lineHeight: 20 },
  exportBtn: {
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    padding: 14,
    gap: 10,
    alignItems: "center",
    flexDirection: "row",
    minHeight: 62,
    justifyContent: "center",
  },
  exportTextBlock: { flex: 1, gap: 2 },
  exportBtnLabel: { fontSize: 14, color: "#6D28D9", fontWeight: "700" },
  exportBtnSub: { fontSize: 11, color: "#6B7280", lineHeight: 16 },
  actionDisabled: { opacity: 0.6 },

  signOutBtn: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    alignItems: "center",
  },
  signOutText: { fontSize: 15, fontWeight: "600", color: "#EF4444" },

  deleteBtn: {
    backgroundColor: "#FFF5F5",
    borderRadius: 20,
    padding: 18,
    alignItems: "center",
    gap: 4,
  },
  deleteBtnLabel: { fontSize: 14, fontWeight: "600", color: "#EF4444" },
  deleteBtnSub: { fontSize: 11, color: "#9CA3AF" },

  separator: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 16,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    gap: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1F2937" },
  modalSub: { fontSize: 14, color: "#6B7280", lineHeight: 22 },
  modalEmail: { fontWeight: "600", color: "#1F2937" },
  otpInput: {
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    fontSize: 24,
    letterSpacing: 8,
    textAlign: "center",
    color: "#1F2937",
  },
  modalActions: { flexDirection: "row", gap: 12 },
  modalCancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  modalCancelText: { fontSize: 15, fontWeight: "600", color: "#6B7280" },
  modalConfirmBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#EF4444",
    alignItems: "center",
  },
  modalConfirmBtnPrimary: { backgroundColor: "#6D28D9" },
  modalBtnDisabled: { opacity: 0.5 },
  modalConfirmText: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },
  nameInput: {
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#1F2937",
  },

  customTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  customTimeInput: {
    width: 52,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    color: "#1F2937",
  },
  customTimeSep: {
    fontSize: 20,
    fontWeight: "700",
    color: "#6B7280",
  },
  customTimeApply: {
    backgroundColor: "#EDE5FF",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  customTimeApplyText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6D28D9",
  },
});
