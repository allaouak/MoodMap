import { z } from "zod";

function isValidIANATimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const updateProfileSchema = z.object({
  display_name: z
    .string()
    .min(2, "Minimum 2 caractères")
    .max(50, "Maximum 50 caractères")
    .optional(),
  avatar_url: z.string().url("URL invalide").nullable().optional(),
  timezone: z
    .string()
    .refine(isValidIANATimezone, "Timezone IANA invalide")
    .optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
