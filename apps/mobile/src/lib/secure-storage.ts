import * as SecureStore from "expo-secure-store";
import { createJSONStorage } from "zustand/middleware";

const STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export const zustandSecureStorage = createJSONStorage(() => ({
  getItem: (key: string) => SecureStore.getItemAsync(key, STORE_OPTIONS),
  setItem: (key: string, value: string) =>
    SecureStore.setItemAsync(key, value, STORE_OPTIONS),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key, STORE_OPTIONS),
}));
