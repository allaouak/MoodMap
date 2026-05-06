import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { z } from "zod";

const PREF_KEY = "notification_prefs";

export interface NotificationPrefs {
  enabled: boolean;
  hour: number;
  minute: number;
}

const notificationPrefsSchema = z.object({
  enabled: z.boolean(),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
});

const DEFAULT_PREFS: NotificationPrefs = {
  enabled: false,
  hour: 20,
  minute: 0,
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const notificationService = {
  async getPrefs(): Promise<NotificationPrefs> {
    try {
      const raw = await SecureStore.getItemAsync(PREF_KEY);
      if (!raw) return DEFAULT_PREFS;
      const parsed = notificationPrefsSchema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : DEFAULT_PREFS;
    } catch {
      return DEFAULT_PREFS;
    }
  },

  async savePrefs(prefs: NotificationPrefs): Promise<void> {
    await SecureStore.setItemAsync(PREF_KEY, JSON.stringify(prefs));
  },

  async requestPermission(): Promise<boolean> {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === "granted") return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  },

  async scheduleDaily(hour: number, minute: number, timezone?: string): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "MoodMap",
        body: "Ton moment de pause est arrivé.",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        repeats: true,
        hour,
        minute,
        ...(timezone ? { timezone } : {}),
      },
    });
  },

  async cancelAll(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  async apply(prefs: NotificationPrefs, timezone?: string): Promise<boolean> {
    if (!prefs.enabled) {
      await this.cancelAll();
      await this.savePrefs(prefs);
      return true;
    }
    const granted = await this.requestPermission();
    if (!granted) return false;
    await this.scheduleDaily(prefs.hour, prefs.minute, timezone);
    await this.savePrefs(prefs);
    return true;
  },
};
