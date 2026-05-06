import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useOfflineQueueStore } from "@/stores/offline-queue.store";
import { useAuthStore } from "@/stores/auth.store";
import { contextualEntryService } from "@/services/contextual-entry.service";

async function flushQueue() {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return;

  useOfflineQueueStore.getState().purgeExpired();

  const { queue, dequeue } = useOfflineQueueStore.getState();
  // On ne rejoue que les writes de l'utilisateur courant — sécurité cross-user.
  const pending = queue.filter((w) => w.userId === userId);

  for (const write of pending) {
    try {
      const { payload } = write;
      if (payload.type === "sleep") {
        await contextualEntryService.saveSleep(write.userId, write.date, payload.data, {
          skipQueue: true,
        });
      } else if (payload.type === "activity") {
        await contextualEntryService.saveActivity(write.userId, write.date, payload.data, {
          skipQueue: true,
        });
      } else if (payload.type === "screen_time") {
        await contextualEntryService.saveScreenTime(write.userId, write.date, payload.data, {
          skipQueue: true,
        });
      }
      dequeue(write.id);
    } catch {
      // Toujours hors-ligne — on arrête le flush, les autres restent en queue.
      break;
    }
  }
}

export function useFlushOfflineQueue() {
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    void flushQueue();

    const sub = AppState.addEventListener("change", (next) => {
      if (appStateRef.current !== "active" && next === "active") {
        void flushQueue();
      }
      appStateRef.current = next;
    });

    return () => sub.remove();
  }, []);
}
