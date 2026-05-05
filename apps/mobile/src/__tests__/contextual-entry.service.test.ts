jest.mock("../lib/supabase", () => ({
  supabase: { from: jest.fn() },
}));

import { supabase } from "../lib/supabase";
import { contextualEntryService } from "../services/contextual-entry.service";

const fromMock = supabase.from as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("contextualEntryService.saveScreenTime", () => {
  it("valide et transmet le temps d'écran en minutes", async () => {
    const upsertMock = jest.fn().mockResolvedValue({ error: null });
    fromMock.mockReturnValue({ upsert: upsertMock });

    await contextualEntryService.saveScreenTime("user-1", "2026-05-02", {
      total_min: 210,
      source: "manual",
    });

    expect(fromMock).toHaveBeenCalledWith("contextual_entries");
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        entry_date: "2026-05-02",
        screen_total_min: 210,
        screen_source: "manual",
      }),
      { onConflict: "user_id,entry_date" }
    );
  });

  it("rejette une durée supérieure à 24 heures avant l'appel Supabase", async () => {
    await expect(
      contextualEntryService.saveScreenTime("user-1", "2026-05-02", {
        total_min: 1500,
        source: "manual",
      })
    ).rejects.toThrow();

    expect(fromMock).not.toHaveBeenCalled();
  });
});

describe("contextualEntryService.clearScreenTime", () => {
  it("efface uniquement les colonnes de temps d'écran pour la date donnée", async () => {
    const eqDateMock = jest.fn().mockResolvedValue({ error: null });
    const eqUserMock = jest.fn(() => ({ eq: eqDateMock }));
    const updateMock = jest.fn(() => ({ eq: eqUserMock }));
    fromMock.mockReturnValue({ update: updateMock });

    await contextualEntryService.clearScreenTime("user-1", "2026-05-02");

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        screen_total_min: null,
        screen_source: null,
      })
    );
    expect(eqUserMock).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqDateMock).toHaveBeenCalledWith("entry_date", "2026-05-02");
  });
});
