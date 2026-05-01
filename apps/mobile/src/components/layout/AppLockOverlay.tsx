import { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from "react-native";
import { biometricService } from "@/services/biometric.service";

interface AppLockOverlayProps {
  onUnlock: () => void;
}

export function AppLockOverlay({ onUnlock }: AppLockOverlayProps) {
  const attemptedRef = useRef(false);

  const tryAuth = async () => {
    const success = await biometricService.authenticate();
    if (success) onUnlock();
  };

  // Déclenche automatiquement la biométrie au premier affichage
  useEffect(() => {
    if (attemptedRef.current) return;
    attemptedRef.current = true;
    tryAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.overlay}>
      <StatusBar barStyle="light-content" />
      <View style={styles.content}>
        <Text style={styles.emoji}>🔒</Text>
        <Text style={styles.title}>MoodMap est verrouillé</Text>
        <Text style={styles.subtitle}>
          Ton journal est protégé par biométrie.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={tryAuth}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Déverrouiller</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#1A0A2E",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  content: {
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 40,
  },
  emoji: {
    fontSize: 56,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 21,
  },
  button: {
    marginTop: 8,
    backgroundColor: "#6D28D9",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 16,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
