import * as SecureStore from "expo-secure-store";

const KEY = "moodmap.onboarding_seen";

export const onboardingService = {
  async hasSeen(): Promise<boolean> {
    try {
      return (await SecureStore.getItemAsync(KEY)) === "true";
    } catch {
      return false;
    }
  },

  async markSeen(): Promise<void> {
    await SecureStore.setItemAsync(KEY, "true");
  },
};
