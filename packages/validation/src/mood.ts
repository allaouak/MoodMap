import { z } from "zod";

export const checkInSchema = z.object({
  mood: z.number().int().min(1).max(5),
  energy: z.number().int().min(1).max(5),
  stress: z.number().int().min(1).max(5),
  note: z.string().trim().max(500).optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
});

export const entryInputSchema = z.object({
  mood: z.number().int().min(1).max(5),
  energy: z.number().int().min(1).max(5),
  stress: z.number().int().min(1).max(5),
  note: z.string().trim().max(500).nullish().transform((v) => v ?? null),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).optional().transform((v) => v ?? []),
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type CheckInInput = z.infer<typeof checkInSchema>;
export type EntryInput = z.infer<typeof entryInputSchema>;
