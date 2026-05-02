// Mock Supabase avant tout import du service
jest.mock("../lib/supabase", () => ({
  supabase: { from: jest.fn() },
}));

import { moodService } from "../services/mood.service";
import { supabase } from "../lib/supabase";

const fromMock = supabase.from as jest.Mock;

function buildChain(overrides: { singleResult?: object } = {}) {
  const singleMock = jest.fn().mockResolvedValue({
    data: {
      id: "entry-1",
      user_id: "user-1",
      mood: 3,
      energy: 3,
      stress: 3,
      note: null,
      tags: [],
      entry_date: "2026-05-01",
      created_at: "",
      updated_at: "",
      ...overrides.singleResult,
    },
    error: null,
  });

  const updateMock = jest.fn(() => ({
    eq: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({ single: singleMock })),
      })),
    })),
  }));

  fromMock.mockReturnValue({ update: updateMock });
  return { updateMock, singleMock };
}

beforeEach(() => jest.clearAllMocks());

// ─── updateEntry ─────────────────────────────────────────────────────────────

describe("moodService.updateEntry — effacement de note", () => {
  it("transmet note: null explicitement quand la note est effacée", async () => {
    const { updateMock } = buildChain();

    await moodService.updateEntry("entry-1", "user-1", {
      mood: 3,
      energy: 3,
      stress: 3,
      note: null,
    });

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ note: null })
    );
  });

  it("transmet la note quand elle est renseignée", async () => {
    const { updateMock } = buildChain();

    await moodService.updateEntry("entry-1", "user-1", {
      mood: 4,
      energy: 4,
      stress: 2,
      note: "Bonne journée",
    });

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ note: "Bonne journée" })
    );
  });

  it("inclut updated_at dans le payload", async () => {
    const { updateMock } = buildChain();

    await moodService.updateEntry("entry-1", "user-1", { mood: 3, energy: 3, stress: 3 });

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ updated_at: expect.any(String) })
    );
  });

  it("lève une exception si Supabase retourne une erreur", async () => {
    const singleMock = jest.fn().mockResolvedValue({ data: null, error: { message: "RLS violation" } });
    fromMock.mockReturnValue({
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({ single: singleMock })),
          })),
        })),
      })),
    });

    await expect(
      moodService.updateEntry("entry-1", "user-1", { mood: 3, energy: 3, stress: 3 })
    ).rejects.toBeDefined();
  });
});
