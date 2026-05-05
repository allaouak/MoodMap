jest.mock("expo-local-authentication", () => ({
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
  authenticateAsync: jest.fn(),
}));

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { biometricService } from "../services/biometric.service";

const mockHasHardware = LocalAuthentication.hasHardwareAsync as jest.Mock;
const mockIsEnrolled = LocalAuthentication.isEnrolledAsync as jest.Mock;
const mockAuthenticate = LocalAuthentication.authenticateAsync as jest.Mock;
const mockGetItem = SecureStore.getItemAsync as jest.Mock;
const mockSetItem = SecureStore.setItemAsync as jest.Mock;

beforeEach(() => jest.clearAllMocks());

// ─── isSupported ─────────────────────────────────────────────────────────────

describe("biometricService.isSupported", () => {
  it("retourne true si le matériel est compatible et des données biométriques sont enregistrées", async () => {
    mockHasHardware.mockResolvedValue(true);
    mockIsEnrolled.mockResolvedValue(true);
    expect(await biometricService.isSupported()).toBe(true);
  });

  it("retourne false si le matériel est incompatible", async () => {
    mockHasHardware.mockResolvedValue(false);
    expect(await biometricService.isSupported()).toBe(false);
    expect(mockIsEnrolled).not.toHaveBeenCalled();
  });

  it("retourne false si aucune donnée biométrique n'est enregistrée", async () => {
    mockHasHardware.mockResolvedValue(true);
    mockIsEnrolled.mockResolvedValue(false);
    expect(await biometricService.isSupported()).toBe(false);
  });
});

// ─── authenticate ─────────────────────────────────────────────────────────────

describe("biometricService.authenticate", () => {
  it("retourne true si l'authentification réussit", async () => {
    mockAuthenticate.mockResolvedValue({ success: true });
    expect(await biometricService.authenticate()).toBe(true);
  });

  it("retourne false si l'utilisateur annule", async () => {
    mockAuthenticate.mockResolvedValue({ success: false, error: "user_cancel" });
    expect(await biometricService.authenticate()).toBe(false);
  });

  it("retourne false en cas d'erreur matérielle", async () => {
    mockAuthenticate.mockResolvedValue({ success: false, error: "lockout" });
    expect(await biometricService.authenticate()).toBe(false);
  });

  it("transmet les bons paramètres à authenticateAsync", async () => {
    mockAuthenticate.mockResolvedValue({ success: true });
    await biometricService.authenticate();
    expect(mockAuthenticate).toHaveBeenCalledWith(
      expect.objectContaining({
        promptMessage: expect.any(String),
        disableDeviceFallback: false,
      })
    );
  });
});

// ─── getLockEnabled ────────────────────────────────────────────────────────────

describe("biometricService.getLockEnabled", () => {
  it("retourne true quand la valeur stockée est 'true'", async () => {
    mockGetItem.mockResolvedValue("true");
    expect(await biometricService.getLockEnabled()).toBe(true);
  });

  it("retourne false quand la valeur stockée est 'false'", async () => {
    mockGetItem.mockResolvedValue("false");
    expect(await biometricService.getLockEnabled()).toBe(false);
  });

  it("retourne false quand aucune valeur n'est stockée", async () => {
    mockGetItem.mockResolvedValue(null);
    expect(await biometricService.getLockEnabled()).toBe(false);
  });

  it("retourne false en cas d'erreur SecureStore", async () => {
    mockGetItem.mockRejectedValue(new Error("SecureStore unavailable"));
    expect(await biometricService.getLockEnabled()).toBe(false);
  });
});

// ─── setLockEnabled ────────────────────────────────────────────────────────────

describe("biometricService.setLockEnabled", () => {
  it("stocke 'true' quand enabled=true", async () => {
    mockSetItem.mockResolvedValue(undefined);
    await biometricService.setLockEnabled(true);
    expect(mockSetItem).toHaveBeenCalledWith("app_lock_enabled", "true");
  });

  it("stocke 'false' quand enabled=false", async () => {
    mockSetItem.mockResolvedValue(undefined);
    await biometricService.setLockEnabled(false);
    expect(mockSetItem).toHaveBeenCalledWith("app_lock_enabled", "false");
  });

  it("propage l'erreur si SecureStore échoue", async () => {
    mockSetItem.mockRejectedValue(new Error("write error"));
    await expect(biometricService.setLockEnabled(true)).rejects.toThrow();
  });
});
