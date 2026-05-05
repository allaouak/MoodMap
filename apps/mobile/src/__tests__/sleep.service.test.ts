jest.mock("react-native", () => ({ Platform: { OS: "ios" } }));
jest.mock("../utils/runtime", () => ({ isExpoGo: jest.fn() }));
jest.mock("@kingstinct/react-native-healthkit", () => ({
  __esModule: true,
  isHealthDataAvailableAsync: jest.fn(),
  requestAuthorization: jest.fn(),
  queryCategorySamples: jest.fn(),
}));

import { isExpoGo } from "../utils/runtime";
import {
  sleepQualityFromMinutes,
  toHHMM,
  toDate,
  sleepWindow,
  sleepService,
} from "../services/sleep.service";

const isExpoGoMock = isExpoGo as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  isExpoGoMock.mockReturnValue(false);
});

// ─── sleepQualityFromMinutes ──────────────────────────────────────────────────

describe("sleepQualityFromMinutes", () => {
  it("5 pour 450 min (7h30) ou plus", () => {
    expect(sleepQualityFromMinutes(450)).toBe(5);
    expect(sleepQualityFromMinutes(600)).toBe(5);
  });

  it("4 pour 360–449 min (6h–7h29)", () => {
    expect(sleepQualityFromMinutes(360)).toBe(4);
    expect(sleepQualityFromMinutes(420)).toBe(4);
    expect(sleepQualityFromMinutes(449)).toBe(4);
  });

  it("3 pour 300–359 min (5h–5h59)", () => {
    expect(sleepQualityFromMinutes(300)).toBe(3);
    expect(sleepQualityFromMinutes(330)).toBe(3);
    expect(sleepQualityFromMinutes(359)).toBe(3);
  });

  it("2 pour 240–299 min (4h–4h59)", () => {
    expect(sleepQualityFromMinutes(240)).toBe(2);
    expect(sleepQualityFromMinutes(270)).toBe(2);
    expect(sleepQualityFromMinutes(299)).toBe(2);
  });

  it("1 pour moins de 240 min", () => {
    expect(sleepQualityFromMinutes(239)).toBe(1);
    expect(sleepQualityFromMinutes(0)).toBe(1);
  });
});

// ─── toHHMM ──────────────────────────────────────────────────────────────────

describe("toHHMM", () => {
  it("formate correctement une heure simple", () => {
    const date = new Date(2026, 4, 5, 7, 30); // 07:30
    expect(toHHMM(date)).toBe("07:30");
  });

  it("pad les zéros pour les heures et minutes < 10", () => {
    const date = new Date(2026, 4, 5, 0, 5); // 00:05
    expect(toHHMM(date)).toBe("00:05");
  });

  it("gère minuit (00:00)", () => {
    const date = new Date(2026, 4, 5, 0, 0);
    expect(toHHMM(date)).toBe("00:00");
  });

  it("format HH:MM regex", () => {
    expect(toHHMM(new Date(2026, 4, 5, 23, 59))).toMatch(/^\d{2}:\d{2}$/);
  });
});

// ─── toDate ──────────────────────────────────────────────────────────────────

describe("toDate", () => {
  it("retourne la même instance si c'est déjà une Date", () => {
    const d = new Date("2026-05-05T07:00:00Z");
    expect(toDate(d)).toBe(d);
  });

  it("convertit une string ISO en Date", () => {
    const result = toDate("2026-05-05T07:00:00Z");
    expect(result).toBeInstanceOf(Date);
    expect(result.getTime()).toBe(new Date("2026-05-05T07:00:00Z").getTime());
  });
});

// ─── sleepWindow ─────────────────────────────────────────────────────────────

describe("sleepWindow", () => {
  it("start = veille à 18h", () => {
    const { start } = sleepWindow("2026-05-05");
    expect(start.getHours()).toBe(18);
    expect(start.getMinutes()).toBe(0);
  });

  it("end = jour J à 12h", () => {
    const { end } = sleepWindow("2026-05-05");
    expect(end.getHours()).toBe(12);
    expect(end.getMinutes()).toBe(0);
  });

  it("start est la veille du jour ciblé", () => {
    const { start, end } = sleepWindow("2026-05-05");
    expect(end.getTime() - start.getTime()).toBe(18 * 60 * 60 * 1000); // 18h de fenêtre
  });
});

// ─── sleepService.requestPermission — ExpoGo ─────────────────────────────────

describe("sleepService.requestPermission — ExpoGo", () => {
  it("retourne false sans accéder à HealthKit", async () => {
    isExpoGoMock.mockReturnValue(true);
    expect(await sleepService.requestPermission()).toBe(false);
  });
});

// ─── sleepService.fetchForDate — ExpoGo ──────────────────────────────────────

describe("sleepService.fetchForDate — ExpoGo", () => {
  it("retourne null sans accéder à HealthKit", async () => {
    isExpoGoMock.mockReturnValue(true);
    expect(await sleepService.fetchForDate("2026-05-05")).toBeNull();
  });
});
