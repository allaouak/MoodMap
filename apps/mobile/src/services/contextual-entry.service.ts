import { supabase } from "@/lib/supabase";
import { z } from "zod";
import type {
  ContextualEntry,
  SleepData,
  ActivityData,
  ScreenTimeData,
} from "@/types/contextual";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timeSchema = z.string().regex(/^\d{2}:\d{2}$/);

const sleepSchema = z.object({
  duration_min: z.number().int().min(0).max(1440),
  bedtime: timeSchema,
  wake_time: timeSchema,
  quality: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  source: z.enum(["healthkit", "health_connect", "manual"]),
});

const activitySchema = z.object({
  steps: z.number().int().min(0).max(100000),
  active_min: z.number().int().min(0).max(1440),
  training_min: z.number().int().min(0).max(1440),
  level: z.enum(["sedentary", "light", "moderate", "active"]),
  source: z.enum(["healthkit", "health_connect", "manual"]),
});

const screenTimeSchema = z.object({
  total_min: z.number().int().min(0).max(1440),
  source: z.literal("manual"),
});

export const contextualEntryService = {
  async getForDate(userId: string, date: string): Promise<ContextualEntry | null> {
    const validDate = dateSchema.parse(date);
    const { data, error } = await supabase
      .from("contextual_entries")
      .select("*")
      .eq("user_id", userId)
      .eq("entry_date", validDate)
      .maybeSingle();

    if (error) throw error;
    return data as ContextualEntry;
  },

  async getForDateRange(
    userId: string,
    from: string,
    to: string
  ): Promise<ContextualEntry[]> {
    const validFrom = dateSchema.parse(from);
    const validTo = dateSchema.parse(to);
    const { data, error } = await supabase
      .from("contextual_entries")
      .select("*")
      .eq("user_id", userId)
      .gte("entry_date", validFrom)
      .lte("entry_date", validTo)
      .order("entry_date", { ascending: false });

    if (error) throw error;
    return (data ?? []) as ContextualEntry[];
  },

  async saveSleep(userId: string, date: string, sleep: SleepData): Promise<void> {
    const validDate = dateSchema.parse(date);
    const validated = sleepSchema.parse(sleep);
    const { error } = await supabase
      .from("contextual_entries")
      .upsert(
        {
          user_id: userId,
          entry_date: validDate,
          sleep_duration_min: validated.duration_min,
          sleep_bedtime: validated.bedtime,
          sleep_wake_time: validated.wake_time,
          sleep_quality: validated.quality,
          sleep_source: validated.source,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,entry_date" }
      );
    if (error) throw error;
  },

  async saveActivity(userId: string, date: string, activity: ActivityData): Promise<void> {
    const validDate = dateSchema.parse(date);
    const validated = activitySchema.parse(activity);
    const { error } = await supabase
      .from("contextual_entries")
      .upsert(
        {
          user_id: userId,
          entry_date: validDate,
          activity_steps: validated.steps,
          activity_active_min: validated.active_min,
          activity_training_min: validated.training_min,
          activity_level: validated.level,
          activity_source: validated.source,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,entry_date" }
      );
    if (error) throw error;
  },

  async saveScreenTime(userId: string, date: string, screen: ScreenTimeData): Promise<void> {
    const validDate = dateSchema.parse(date);
    const validated = screenTimeSchema.parse(screen);
    const { error } = await supabase
      .from("contextual_entries")
      .upsert(
        {
          user_id: userId,
          entry_date: validDate,
          screen_total_min: validated.total_min,
          screen_source: validated.source,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,entry_date" }
      );
    if (error) throw error;
  },

  async clearScreenTime(userId: string, date: string): Promise<void> {
    const validDate = dateSchema.parse(date);
    const { error } = await supabase
      .from("contextual_entries")
      .update({
        screen_total_min: null,
        screen_source: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("entry_date", validDate);

    if (error) throw error;
  },
};
