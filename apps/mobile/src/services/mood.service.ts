import { supabase } from "@/lib/supabase";
import { CreateMoodEntryInput, MoodEntry } from "@/types";
import { format } from "date-fns";

export const moodService = {
  async getTodayEntry(userId: string): Promise<MoodEntry | null> {
    const today = format(new Date(), "yyyy-MM-dd");
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
    const { data, error } = await supabase
      .from("mood_entries")
      .insert({
        user_id: userId,
        mood: input.mood,
        energy: input.energy,
        stress: input.stress,
        note: input.note ?? null,
        tags: input.tags ?? [],
        entry_date: input.entry_date,
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
    const { data, error } = await supabase
      .from("mood_entries")
      .update({
        ...input,
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
