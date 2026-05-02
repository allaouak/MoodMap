jest.mock("../lib/supabase", () => ({
  supabase: { from: jest.fn() },
}));

import { supabase } from "../lib/supabase";
import { dataExportService } from "../services/data-export.service";

const fromMock = supabase.from as jest.Mock;

function tableMock(table: string) {
  if (table === "profiles") {
    return {
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn().mockResolvedValue({
            data: {
              id: "user-1",
              display_name: "Alex",
              avatar_url: null,
              timezone: "Europe/Paris",
              premium: false,
              created_at: "2026-05-01T00:00:00.000Z",
              updated_at: "2026-05-01T00:00:00.000Z",
            },
            error: null,
          }),
        })),
      })),
    };
  }

  if (table === "mood_entries") {
    return {
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn().mockResolvedValue({
            data: [{ id: "mood-1", user_id: "user-1", entry_date: "2026-05-02" }],
            error: null,
          }),
        })),
      })),
    };
  }

  if (table === "contextual_consent") {
    return {
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn().mockResolvedValue({
            data: [{ module: "screen_time", enabled: true }],
            error: null,
          }),
        })),
      })),
    };
  }

  return {
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn().mockResolvedValue({
          data: [{ id: "context-1", user_id: "user-1", screen_total_min: 210 }],
          error: null,
        }),
      })),
    })),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  fromMock.mockImplementation(tableMock);
});

describe("dataExportService", () => {
  it("construit un export JSON avec humeur et données contextuelles", async () => {
    const json = await dataExportService.buildExportJson("user-1", "alex@example.com");
    const parsed = JSON.parse(json);

    expect(parsed.schema_version).toBe(1);
    expect(parsed.account).toEqual({ user_id: "user-1", email: "alex@example.com" });
    expect(parsed.profile.display_name).toBe("Alex");
    expect(parsed.mood_entries).toHaveLength(1);
    expect(parsed.contextual_consents).toHaveLength(1);
    expect(parsed.contextual_entries[0].screen_total_min).toBe(210);
  });
});
