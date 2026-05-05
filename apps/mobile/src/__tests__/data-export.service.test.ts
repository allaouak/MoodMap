jest.mock("../lib/supabase", () => ({
  supabase: { from: jest.fn() },
}));

jest.mock("expo-file-system", () => {
  const fileInstances: unknown[] = [];

  class MockFile {
    static instances = fileInstances;
    uri: string;
    exists = true;
    create = jest.fn();
    write = jest.fn();
    delete = jest.fn(() => {
      this.exists = false;
    });

    constructor(...parts: string[]) {
      this.uri = parts.join("/");
      fileInstances.push(this);
    }
  }

  return {
    File: MockFile,
    Paths: { cache: "cache://" },
  };
});

import { supabase } from "../lib/supabase";
import { dataExportService } from "../services/data-export.service";
import { File } from "expo-file-system";

const fromMock = supabase.from as jest.Mock;
const MockFile = File as unknown as { instances: Array<{ delete: jest.Mock }> };

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
  MockFile.instances.length = 0;
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

  it("supprime un fichier d'export temporaire si présent", () => {
    dataExportService.deleteExportFile("cache://moodmap-export-2026-05-04.json");

    expect(MockFile.instances).toHaveLength(1);
    const [file] = MockFile.instances;
    expect(file).toBeDefined();
    expect(file?.delete).toHaveBeenCalledTimes(1);
  });
});
