import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

const LOCK_KEY = "app_lock_enabled";

export const biometricService = {
  async isSupported(): Promise<boolean> {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) return false;
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return enrolled;
  },

  async authenticate(): Promise<boolean> {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Déverrouille ton journal",
      fallbackLabel: "Utiliser le code",
      cancelLabel: "Annuler",
      disableDeviceFallback: false,
    });
    return result.success;
  },

  async getLockEnabled(): Promise<boolean> {
    try {
      const value = await SecureStore.getItemAsync(LOCK_KEY);
      return value === "true";
    } catch {
      return false;
    }
  },

  async setLockEnabled(enabled: boolean): Promise<void> {
    await SecureStore.setItemAsync(LOCK_KEY, enabled ? "true" : "false");
  },
};
