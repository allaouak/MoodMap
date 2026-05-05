jest.mock("react-native", () => ({ Platform: { OS: "ios" } }));
jest.mock("../utils/runtime", () => ({ isExpoGo: jest.fn() }));
jest.mock("@kingstinct/react-native-healthkit", () => ({
  __esModule: true,
  isHealthDataAvailableAsync: jest.fn(),
  requestAuthorization: jest.fn(),
  queryStatisticsForQuantity: jest.fn(),
}));

import { isExpoGo } from "../utils/runtime";
import {
  activityLevelFromSteps,
  dayWindow,
  activityService,
} from "../services/activity.service";

const isExpoGoMock = isExpoGo as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  isExpoGoMock.mockReturnValue(false);
});

// ─── activityLevelFromSteps ───────────────────────────────────────────────────

describe("activityLevelFromSteps", () => {
  it("active pour 10 000 pas ou plus", () => {
    expect(activityLevelFromSteps(10000)).toBe("active");
    expect(activityLevelFromSteps(15000)).toBe("active");
  });

  it("moderate pour 7 000–9 999 pas", () => {
    expect(activityLevelFromSteps(7000)).toBe("moderate");
    expect(activityLevelFromSteps(9999)).toBe("moderate");
  });

  it("light pour 3 000–6 999 pas", () => {
    expect(activityLevelFromSteps(3000)).toBe("light");
    expect(activityLevelFromSteps(6999)).toBe("light");
  });

  it("sedentary pour moins de 3 000 pas", () => {
    expect(activityLevelFromSteps(2999)).toBe("sedentary");
    expect(activityLevelFromSteps(0)).toBe("sedentary");
  });
});

// ─── dayWindow ────────────────────────────────────────────────────────────────

describe("dayWindow", () => {
  it("start est à minuit du jour ciblé", () => {
    const { start } = dayWindow("2026-05-05");
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
  });

  it("end est à 23h59:59 du même jour", () => {
    const { end } = dayWindow("2026-05-05");
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
    expect(end.getSeconds()).toBe(59);
  });

  it("fenêtre couvre exactement une journée", () => {
    const { start, end } = dayWindow("2026-05-05");
    const diff = end.getTime() - start.getTime();
    expect(diff).toBe(23 * 3600000 + 59 * 60000 + 59000);
  });
});

// ─── activityService.requestPermission — ExpoGo ──────────────────────────────

describe("activityService.requestPermission — ExpoGo", () => {
  it("retourne false sans accéder à HealthKit", async () => {
    isExpoGoMock.mockReturnValue(true);
    expect(await activityService.requestPermission()).toBe(false);
  });
});

// ─── activityService.fetchForDate — ExpoGo ───────────────────────────────────

describe("activityService.fetchForDate — ExpoGo", () => {
  it("retourne null sans accéder à HealthKit", async () => {
    isExpoGoMock.mockReturnValue(true);
    expect(await activityService.fetchForDate("2026-05-05")).toBeNull();
  });
});
