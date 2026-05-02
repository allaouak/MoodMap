import * as Sentry from "@sentry/react-native";
import type { ErrorEvent, EventHint } from "@sentry/core";

// Clés normalisées : lowercase, underscores et tirets supprimés.
// Couvre snake_case ET camelCase : entry_date/entryDate, display_name/displayName, etc.
const SENSITIVE_KEYS_NORMALIZED = new Set([
  "mood", "energy", "stress", "note", "tags", "entrydate",
  "displayname", "avatarurl", "email",
  "password", "newpassword", "confirmpassword",
  "accesstoken", "refreshtoken", "token", "code", "userid", "sub",
]);

function isSensitiveKey(k: string): boolean {
  return SENSITIVE_KEYS_NORMALIZED.has(k.toLowerCase().replace(/[_-]/g, ""));
}

// Patterns pour redacter les PII dans les chaînes libres (messages d'erreur, exceptions)
const PII_PATTERNS: RegExp[] = [
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,  // emails
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, // UUIDs
  /eyJ[A-Za-z0-9+/_-]+(?:\.[A-Za-z0-9+/_-]+)+/g, // JWTs (header.payload.signature)
];

export function scrubString(value: string): string {
  let result = value;
  for (const pattern of PII_PATTERNS) {
    result = result.replace(pattern, "[Filtered]");
    pattern.lastIndex = 0;
  }
  return result;
}

export function scrubRecursive(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[Filtered]";
  if (value === null || typeof value !== "object") {
    // Appliquer scrubString sur toutes les chaînes, même sous une clé non-sensible
    if (typeof value === "string") return scrubString(value);
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => scrubRecursive(item, depth + 1));
  }
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    result[k] = isSensitiveKey(k)
      ? "[Filtered]"
      : scrubRecursive(v, depth + 1);
  }
  return result;
}

function stripQueryParams(url: string | undefined): string | undefined {
  if (!url) return url;
  try {
    const u = new URL(url);
    u.search = "";
    return u.toString();
  } catch {
    return url.split("?")[0];
  }
}

function sanitizeEvent(event: ErrorEvent, _hint: EventHint): ErrorEvent {
  // Supprimer l'identité utilisateur — jamais envoyée à Sentry
  delete event.user;

  // Scrub récursif par clé sur les objets structurés
  if (event.extra) {
    event.extra = scrubRecursive(event.extra) as typeof event.extra;
  }
  if (event.contexts) {
    event.contexts = scrubRecursive(event.contexts) as typeof event.contexts;
  }

  // Scrub des champs textuels libres (messages d'erreur, valeurs d'exception)
  if (typeof event.message === "string") {
    event.message = scrubString(event.message);
  }
  if (event.exception?.values) {
    for (const ex of event.exception.values) {
      if (typeof ex.value === "string") ex.value = scrubString(ex.value);
    }
  }

  // Nettoyer la requête HTTP
  if (event.request) {
    if (event.request.data) event.request.data = "[Filtered]";
    if (event.request.headers) event.request.headers = {};
    const stripped = stripQueryParams(event.request.url);
    if (stripped) event.request.url = stripped;
    if (event.request.query_string) event.request.query_string = "[Filtered]";
  }

  return event;
}

export function initSentry(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: __DEV__ ? "development" : "production",
    enabled: !__DEV__,
    sendDefaultPii: false,
    beforeSend: sanitizeEvent,
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.type === "http") return null;
      if (breadcrumb.data) delete breadcrumb.data;
      if (typeof breadcrumb.message === "string") {
        breadcrumb.message = scrubString(breadcrumb.message);
      }
      return breadcrumb;
    },
  });
}

export const captureException = Sentry.captureException;
export const captureMessage = Sentry.captureMessage;
