import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { useContextualStore } from "@/stores/contextual.store";
import { contextualConsentService } from "@/services/contextual-consent.service";

export function useContextualConsentsLoader() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;
  const setConsents = useContextualStore((s) => s.setConsents);
  const resetContextual = useContextualStore((s) => s.reset);

  useEffect(() => {
    if (!userId) {
      resetContextual();
      return;
    }

    let cancelled = false;
    contextualConsentService
      .getConsents(userId)
      .then((consents) => {
        if (!cancelled) setConsents(consents);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [userId, setConsents, resetContextual]);
}
