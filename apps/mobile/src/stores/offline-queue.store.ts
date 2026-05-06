import { create } from "zustand";
import { persist } from "zustand/middleware";
import { zustandSecureStorage } from "@/lib/secure-storage";
import type { SleepData, ActivityData, ScreenTimeData } from "@/types/contextual";

const MAX_AGE_MS = 48 * 60 * 60 * 1000;

type PendingWritePayload =
  | { type: "sleep"; data: SleepData }
  | { type: "activity"; data: ActivityData }
  | { type: "screen_time"; data: ScreenTimeData };

export interface PendingWrite {
  id: string;
  userId: string;
  date: string;
  enqueuedAt: number;
  payload: PendingWritePayload;
}

interface OfflineQueueState {
  queue: PendingWrite[];
  enqueue: (entry: Omit<PendingWrite, "id" | "enqueuedAt">) => void;
  dequeue: (id: string) => void;
  purgeExpired: () => void;
}

export const useOfflineQueueStore = create<OfflineQueueState>()(
  persist(
    (set) => ({
      queue: [],
      enqueue: (entry) =>
        set((s) => ({
          queue: [
            ...s.queue,
            {
              ...entry,
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              enqueuedAt: Date.now(),
            },
          ],
        })),
      dequeue: (id) =>
        set((s) => ({ queue: s.queue.filter((w) => w.id !== id) })),
      purgeExpired: () =>
        set((s) => ({
          queue: s.queue.filter((w) => Date.now() - w.enqueuedAt < MAX_AGE_MS),
        })),
    }),
    {
      name: "moodmap.offline-queue",
      storage: zustandSecureStorage,
    }
  )
);
