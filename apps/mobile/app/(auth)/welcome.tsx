import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Button } from "@/components/ui/Button";
import { AppIcon } from "@/components/ui/AppIcon";
import { MoodFaceIcon } from "@/components/mood/MoodFaceIcon";

const FEATURES = [
  { icon: "lock-outline" as const, text: "Tes données restent privées et sécurisées" },
  { icon: "chart-line" as const, text: "Visualise tes cycles d'humeur avec douceur" },
  { icon: "brain" as const, text: "Des résumés IA pour mieux te comprendre" },
] as const;

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {/* Zone hero */}
      <View style={styles.hero}>
        <View style={styles.glowRing} />
        <View style={styles.faceCircle}>
          <MoodFaceIcon level={5} size={80} />
        </View>
        <View style={styles.brandBlock}>
          <Text style={styles.brandName}>MoodMap</Text>
          <Text style={styles.tagline}>Comprends-toi mieux, avec douceur.</Text>
        </View>
      </View>

      {/* Carte blanche ancrée en bas */}
      <View style={styles.card}>
        <View style={styles.features}>
          {FEATURES.map((item) => (
            <View key={item.icon} style={styles.featureRow}>
              <AppIcon name={item.icon} size={18} frameSize={34} />
              <Text style={styles.featureText}>{item.text}</Text>
            </View>
          ))}
        </View>
        <View style={styles.ctas}>
          <Button
            label="Commencer"
            size="lg"
            onPress={() => router.push("/(auth)/register")}
          />
          <Button
            label="J'ai déjà un compte"
            variant="ghost"
            size="lg"
            onPress={() => router.push("/(auth)/login")}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F3E8FF",
  },
  hero: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    paddingHorizontal: 32,
  },
  glowRing: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#EDE5FF",
    opacity: 0.55,
  },
  faceCircle: {
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
  brandBlock: {
    alignItems: "center",
    gap: 8,
  },
  brandName: {
    fontSize: 40,
    fontWeight: "800",
    color: "#3B0764",
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
    color: "#7C3AED",
    textAlign: "center",
    maxWidth: 240,
    lineHeight: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 28,
    paddingHorizontal: 28,
    paddingBottom: 12,
    gap: 20,
  },
  features: {
    gap: 12,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
  },
  ctas: {
    gap: 8,
  },
});
