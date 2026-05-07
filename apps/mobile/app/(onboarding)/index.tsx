import { useCallback, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Animated, { FadeIn } from "react-native-reanimated";
import { MoodFaceIcon } from "@/components/mood/MoodFaceIcon";
import { AppIcon } from "@/components/ui/AppIcon";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { notificationService } from "@/services/notification.service";
import { onboardingService } from "@/services/onboarding.service";
import type { MoodLevel } from "@/types";

const MOOD_LEVELS: MoodLevel[] = [1, 2, 3, 4, 5];
const TOTAL_STEPS = 3;

export default function OnboardingScreen() {
  const { profile } = useAuth();
  const [step, setStep] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);

  const firstName = profile?.display_name?.split(" ")[0] ?? "toi";

  const complete = useCallback(async () => {
    try {
      await onboardingService.markSeen();
    } finally {
      router.replace("/(tabs)");
    }
  }, []);

  const goNext = useCallback(() => setStep((s) => s + 1), []);

  const handleEnableNotifs = async () => {
    setNotifLoading(true);
    try {
      await notificationService.apply(
        { enabled: true, hour: 20, minute: 0 },
        profile?.timezone
      );
    } finally {
      setNotifLoading(false);
      await complete();
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {/* Hero — zone violette animée à chaque étape */}
      <Animated.View key={step} entering={FadeIn.duration(220)} style={styles.hero}>
        {step === 0 && (
          <>
            <View style={styles.glowRing} />
            <View style={styles.iconCircle}>
              <MoodFaceIcon level={5} size={80} />
            </View>
          </>
        )}
        {step === 1 && (
          <View style={styles.facesRow}>
            {MOOD_LEVELS.map((lvl) => (
              <MoodFaceIcon key={lvl} level={lvl} size={50} />
            ))}
          </View>
        )}
        {step === 2 && (
          <View style={styles.iconCircle}>
            <AppIcon
              name="bell-outline"
              color="#6D28D9"
              backgroundColor="transparent"
              size={56}
              frameSize={56}
            />
          </View>
        )}
      </Animated.View>

      {/* Carte blanche ancrée en bas */}
      <View style={styles.card}>
        {step === 0 && (
          <>
            <Text style={styles.title}>Bienvenue, {firstName}&nbsp;!</Text>
            <Text style={styles.body}>
              Ton journal émotionnel, privé et bienveillant. Quelques secondes
              par jour pour mieux te comprendre.
            </Text>
            <View style={styles.badge}>
              <AppIcon
                name="lock-outline"
                color="#6D28D9"
                backgroundColor="#EDE5FF"
                size={14}
                frameSize={26}
              />
              <Text style={styles.badgeText}>Tes données restent sur ton compte</Text>
            </View>
          </>
        )}

        {step === 1 && (
          <>
            <Text style={styles.title}>Un check-in en 30 secondes</Text>
            <Text style={styles.body}>
              Chaque jour, note ton humeur, ton énergie et ton stress.{"\n"}
              Au fil du temps, MoodMap révèle tes cycles avec douceur.
            </Text>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.title}>Rester connecté(e) à toi</Text>
            <Text style={styles.body}>
              Veux-tu qu'on te rappelle de faire ton check-in ?{"\n"}
              Tu pourras toujours changer ça dans les réglages.
            </Text>
          </>
        )}

        {/* Indicateur de progression */}
        <View style={styles.dots}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>

        {/* Actions */}
        {step < 2 ? (
          <Button
            label="Suivant"
            size="lg"
            onPress={goNext}
            testID="onboarding-next-button"
          />
        ) : (
          <>
            <Button
              label="Oui, me rappeler à 20h00"
              size="lg"
              loading={notifLoading}
              onPress={handleEnableNotifs}
              testID="onboarding-enable-notifications-button"
            />
            <TouchableOpacity
              onPress={complete}
              disabled={notifLoading}
              activeOpacity={0.7}
              style={styles.skipBtn}
              testID="onboarding-skip-notifications-button"
            >
              <Text style={styles.skipText}>Pas pour l'instant</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F3E8FF" },

  hero: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  glowRing: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#EDE5FF",
    opacity: 0.55,
  },
  iconCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: "#EDE5FF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6D28D9",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },
  facesRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 28,
    paddingHorizontal: 28,
    paddingBottom: 16,
    gap: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1F2937",
    letterSpacing: -0.5,
  },
  body: {
    fontSize: 15,
    color: "#6B7280",
    lineHeight: 24,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F5F3FF",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 13,
    color: "#6D28D9",
    fontWeight: "500",
  },

  dots: {
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    paddingVertical: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#DDD6FE",
  },
  dotActive: {
    width: 20,
    backgroundColor: "#6D28D9",
  },

  skipBtn: {
    alignItems: "center",
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "500",
  },
});
