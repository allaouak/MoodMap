jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  SchedulableTriggerInputTypes: { CALENDAR: "calendar" },
}));

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { notificationService, NotificationPrefs } from "../services/notification.service";

const mockGetPermissions = Notifications.getPermissionsAsync as jest.Mock;
const mockRequestPermissions = Notifications.requestPermissionsAsync as jest.Mock;
const mockCancelAll = Notifications.cancelAllScheduledNotificationsAsync as jest.Mock;
const mockSchedule = Notifications.scheduleNotificationAsync as jest.Mock;
const mockGetItem = SecureStore.getItemAsync as jest.Mock;
const mockSetItem = SecureStore.setItemAsync as jest.Mock;

beforeEach(() => jest.clearAllMocks());

// ─── getPrefs ─────────────────────────────────────────────────────────────────

describe("notificationService.getPrefs", () => {
  it("retourne les préférences stockées valides", async () => {
    const stored: NotificationPrefs = { enabled: true, hour: 20, minute: 30 };
    mockGetItem.mockResolvedValue(JSON.stringify(stored));
    expect(await notificationService.getPrefs()).toEqual(stored);
  });

  it("retourne les préférences par défaut si aucune valeur stockée", async () => {
    mockGetItem.mockResolvedValue(null);
    const prefs = await notificationService.getPrefs();
    expect(prefs.enabled).toBe(false);
    expect(prefs.hour).toBeGreaterThanOrEqual(0);
    expect(prefs.minute).toBeGreaterThanOrEqual(0);
  });

  it("retourne les préférences par défaut si le JSON est corrompu", async () => {
    mockGetItem.mockResolvedValue("not_json{{{");
    const prefs = await notificationService.getPrefs();
    expect(prefs.enabled).toBe(false);
  });

  it("retourne les préférences par défaut si le schéma est invalide", async () => {
    mockGetItem.mockResolvedValue(JSON.stringify({ enabled: "oui", hour: 25 }));
    const prefs = await notificationService.getPrefs();
    expect(prefs.enabled).toBe(false);
  });

  it("retourne les préférences par défaut en cas d'erreur SecureStore", async () => {
    mockGetItem.mockRejectedValue(new Error("unavailable"));
    const prefs = await notificationService.getPrefs();
    expect(prefs.enabled).toBe(false);
  });
});

// ─── apply — notifications désactivées ────────────────────────────────────────

describe("notificationService.apply — désactivé", () => {
  it("annule toutes les notifications et sauvegarde sans demander de permission", async () => {
    mockCancelAll.mockResolvedValue(undefined);
    mockSetItem.mockResolvedValue(undefined);

    const result = await notificationService.apply({ enabled: false, hour: 20, minute: 0 });

    expect(result).toBe(true);
    expect(mockCancelAll).toHaveBeenCalled();
    expect(mockRequestPermissions).not.toHaveBeenCalled();
    expect(mockSetItem).toHaveBeenCalled();
  });
});

// ─── apply — notifications activées ───────────────────────────────────────────

describe("notificationService.apply — activé", () => {
  it("planifie une notification quotidienne si la permission est accordée", async () => {
    mockGetPermissions.mockResolvedValue({ status: "granted" });
    mockCancelAll.mockResolvedValue(undefined);
    mockSchedule.mockResolvedValue("notif-id");
    mockSetItem.mockResolvedValue(undefined);

    const result = await notificationService.apply({ enabled: true, hour: 20, minute: 0 });

    expect(result).toBe(true);
    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: expect.objectContaining({ hour: 20, minute: 0, repeats: true }),
      })
    );
    expect(mockSetItem).toHaveBeenCalled();
  });

  it("inclut le timezone dans le trigger si fourni", async () => {
    mockGetPermissions.mockResolvedValue({ status: "granted" });
    mockCancelAll.mockResolvedValue(undefined);
    mockSchedule.mockResolvedValue("notif-id");
    mockSetItem.mockResolvedValue(undefined);

    await notificationService.apply({ enabled: true, hour: 9, minute: 0 }, "America/New_York");

    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: expect.objectContaining({ timezone: "America/New_York" }),
      })
    );
  });

  it("omet le timezone du trigger si non fourni", async () => {
    mockGetPermissions.mockResolvedValue({ status: "granted" });
    mockCancelAll.mockResolvedValue(undefined);
    mockSchedule.mockResolvedValue("notif-id");
    mockSetItem.mockResolvedValue(undefined);

    await notificationService.apply({ enabled: true, hour: 9, minute: 0 });

    const call = mockSchedule.mock.calls[0]?.[0] as { trigger: Record<string, unknown> };
    expect(call?.trigger).not.toHaveProperty("timezone");
  });

  it("retourne false sans planifier si la permission est refusée", async () => {
    mockGetPermissions.mockResolvedValue({ status: "denied" });
    mockRequestPermissions.mockResolvedValue({ status: "denied" });

    const result = await notificationService.apply({ enabled: true, hour: 20, minute: 0 });

    expect(result).toBe(false);
    expect(mockSchedule).not.toHaveBeenCalled();
    expect(mockSetItem).not.toHaveBeenCalled();
  });

  it("utilise la permission existante sans nouvelle demande si déjà accordée", async () => {
    mockGetPermissions.mockResolvedValue({ status: "granted" });
    mockCancelAll.mockResolvedValue(undefined);
    mockSchedule.mockResolvedValue("notif-id");
    mockSetItem.mockResolvedValue(undefined);

    await notificationService.apply({ enabled: true, hour: 8, minute: 0 });

    expect(mockRequestPermissions).not.toHaveBeenCalled();
  });
});

// ─── cancelAll ────────────────────────────────────────────────────────────────

describe("notificationService.cancelAll", () => {
  it("annule toutes les notifications planifiées", async () => {
    mockCancelAll.mockResolvedValue(undefined);
    await notificationService.cancelAll();
    expect(mockCancelAll).toHaveBeenCalledTimes(1);
  });
});
