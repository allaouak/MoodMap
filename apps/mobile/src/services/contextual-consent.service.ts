import { supabase } from "@/lib/supabase";
import { z } from "zod";
import type { ContextualModule } from "@/types/contextual";

const contextualModuleSchema = z.enum(["sleep", "activity", "screen_time"]);
const ALL_MODULES: ContextualModule[] = ["sleep", "activity", "screen_time"];

export const contextualConsentService = {
  async getConsents(userId: string): Promise<Record<ContextualModule, boolean>> {
    const { data, error } = await supabase
      .from("contextual_consent")
      .select("module, enabled")
      .eq("user_id", userId);

    if (error) throw error;

    const result = Object.fromEntries(
      ALL_MODULES.map((m) => [m, false])
    ) as Record<ContextualModule, boolean>;

    for (const row of data ?? []) {
      if (ALL_MODULES.includes(row.module as ContextualModule)) {
        result[row.module as ContextualModule] = row.enabled;
      }
    }
    return result;
  },

  async setConsent(
    userId: string,
    module: ContextualModule,
    enabled: boolean
  ): Promise<void> {
    const validModule = contextualModuleSchema.parse(module);
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("contextual_consent")
      .upsert(
        {
          user_id: userId,
          module: validModule,
          enabled,
          granted_at: enabled ? now : null,
          revoked_at: enabled ? null : now,
          updated_at: now,
        },
        { onConflict: "user_id,module" }
      );
    if (error) throw error;
  },

  async deleteModuleData(userId: string, module: ContextualModule): Promise<void> {
    const validModule = contextualModuleSchema.parse(module);
    const nullCols: Record<ContextualModule, Record<string, null>> = {
      sleep: {
        sleep_duration_min: null,
        sleep_bedtime: null,
        sleep_wake_time: null,
        sleep_quality: null,
        sleep_source: null,
      },
      activity: {
        activity_steps: null,
        activity_active_min: null,
        activity_training_min: null,
        activity_level: null,
        activity_source: null,
      },
      screen_time: {
        screen_total_min: null,
        screen_source: null,
      },
    };

    const { error } = await supabase
      .from("contextual_entries")
      .update({ ...nullCols[validModule], updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    if (error) throw error;
  },
};
