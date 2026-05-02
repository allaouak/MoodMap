import { supabase } from "@/lib/supabase";
import { CreateMoodEntryInput, MoodEntry } from "@/types";
import { todayISOInTimezone } from "@/utils/date";
import { z } from "zod";

const entryInputSchema = z.object({
  mood: z.number().int().min(1).max(5),
  energy: z.number().int().min(1).max(5),
  stress: z.number().int().min(1).max(5),
  note: z.string().trim().max(500).nullish().transform((v) => v ?? null),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).optional().transform((v) => v ?? []),
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const moodService = {
  async getTodayEntry(userId: string, timezone = "UTC"): Promise<MoodEntry | null> {
    const today = todayISOInTimezone(timezone);
    const { data, error } = await supabase
      .from("mood_entries")
      .select("*")
      .eq("user_id", userId)
      .eq("entry_date", today)
      .maybeSingle();

    if (error) throw error;
    return data as MoodEntry | null;
  },

  async getEntries(
    userId: string,
    from: string,
    to: string
  ): Promise<MoodEntry[]> {
    const { data, error } = await supabase
      .from("mood_entries")
      .select("*")
      .eq("user_id", userId)
      .gte("entry_date", from)
      .lte("entry_date", to)
      .order("entry_date", { ascending: false });

    if (error) throw error;
    return (data ?? []) as MoodEntry[];
  },

  async createEntry(
    userId: string,
    input: CreateMoodEntryInput
  ): Promise<MoodEntry> {
    const validated = entryInputSchema.parse(input);
    const { data, error } = await supabase
      .from("mood_entries")
      .insert({
        user_id: userId,
        mood: validated.mood,
        energy: validated.energy,
        stress: validated.stress,
        note: validated.note,
        tags: validated.tags,
        entry_date: validated.entry_date,
      })
      .select()
      .single();

    if (error) throw error;
    return data as MoodEntry;
  },

  async updateEntry(
    entryId: string,
    userId: string,
    input: Partial<CreateMoodEntryInput>
  ): Promise<MoodEntry> {
    const validated = entryInputSchema.partial().parse(input);
    const { data, error } = await supabase
      .from("mood_entries")
      .update({
        ...validated,
        updated_at: new Date().toISOString(),
      })
      .eq("id", entryId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;
    return data as MoodEntry;
  },

  async deleteEntry(entryId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from("mood_entries")
      .delete()
      .eq("id", entryId)
      .eq("user_id", userId);

    if (error) throw error;
  },
};
