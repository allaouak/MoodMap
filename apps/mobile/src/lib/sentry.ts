import * as Sentry from "@sentry/react-native";
import type { ErrorEvent, EventHint } from "@sentry/core";

// Champs contenant des données émotionnelles ou personnelles — jamais envoyés à Sentry
const SENSITIVE_KEYS = [
  "mood", "energy", "stress", "note", "tags", "entry_date",
  "display_name", "avatar_url", "email", "password",
  "access_token", "refresh_token", "token", "code",
];

function scrub(obj: Record<string, unknown>): Record<string, unknown> {
  const result = { ...obj };
  for (const key of SENSITIVE_KEYS) {
    if (key in result) result[key] = "[Filtered]";
  }
  return result;
}

function sanitizeEvent(event: ErrorEvent, _hint: EventHint): ErrorEvent {
  if (event.extra) {
    event.extra = scrub(event.extra as Record<string, unknown>);
  }

  // Retirer les corps de requêtes (contiennent les entrées d'humeur)
  if (event.request?.data) {
    event.request.data = "[Filtered]";
  }

  return event;
}

export function initSentry(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: __DEV__ ? "development" : "production",
    // Désactivé en dev pour ne pas polluer le projet Sentry pendant le développement
    enabled: !__DEV__,
    beforeSend: sanitizeEvent,
    beforeBreadcrumb(breadcrumb) {
      // Supprimer les breadcrumbs réseau — les réponses API contiennent des données émotionnelles
      if (breadcrumb.type === "http") return null;
      // Supprimer les données des autres breadcrumbs (logs console, navigation)
      if (breadcrumb.data) delete breadcrumb.data;
      return breadcrumb;
    },
  });
}

export const captureException = Sentry.captureException;
export const captureMessage = Sentry.captureMessage;
