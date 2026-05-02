import { supabase } from "@/lib/supabase";
import { File, Paths } from "expo-file-system";
import type { ContextualEntry, ContextualModule } from "@/types/contextual";
import type { MoodEntry, Profile } from "@/types";

interface ContextualConsentExport {
  module: ContextualModule;
  enabled: boolean;
  granted_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MoodMapExport {
  schema_version: 1;
  exported_at: string;
  account: {
    user_id: string;
    email: string | null;
  };
  profile: Profile | null;
  mood_entries: MoodEntry[];
  contextual_consents: ContextualConsentExport[];
  contextual_entries: ContextualEntry[];
}

function todayForFilename(): string {
  return new Date().toISOString().slice(0, 10);
}

export const dataExportService = {
  async buildExport(userId: string, email: string | null): Promise<MoodMapExport> {
    const [profileResult, moodResult, consentResult, contextualResult] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase
        .from("mood_entries")
        .select("*")
        .eq("user_id", userId)
        .order("entry_date", { ascending: true }),
      supabase
        .from("contextual_consent")
        .select("module, enabled, granted_at, revoked_at, created_at, updated_at")
        .eq("user_id", userId)
        .order("module", { ascending: true }),
      supabase
        .from("contextual_entries")
        .select("*")
        .eq("user_id", userId)
        .order("entry_date", { ascending: true }),
    ]);

    if (profileResult.error) throw profileResult.error;
    if (moodResult.error) throw moodResult.error;
    if (consentResult.error) throw consentResult.error;
    if (contextualResult.error) throw contextualResult.error;

    return {
      schema_version: 1,
      exported_at: new Date().toISOString(),
      account: {
        user_id: userId,
        email,
      },
      profile: profileResult.data as Profile | null,
      mood_entries: (moodResult.data ?? []) as MoodEntry[],
      contextual_consents: (consentResult.data ?? []) as ContextualConsentExport[],
      contextual_entries: (contextualResult.data ?? []) as ContextualEntry[],
    };
  },

  async buildExportJson(userId: string, email: string | null): Promise<string> {
    const data = await this.buildExport(userId, email);
    return JSON.stringify(data, null, 2);
  },

  async writeExportFile(userId: string, email: string | null): Promise<string> {
    const json = await this.buildExportJson(userId, email);
    const file = new File(Paths.cache, `moodmap-export-${todayForFilename()}.json`);
    file.create({ overwrite: true, intermediates: true });
    file.write(json, { encoding: "utf8" });
    return file.uri;
  },
};
