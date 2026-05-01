import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Événements qui activent le premium
const PREMIUM_EVENTS = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "UNCANCELLATION",
  "PRODUCT_CHANGE",
]);

// Événements qui révoquent le premium
// CANCELLATION est exclu : l'utilisateur garde l'accès jusqu'à EXPIRATION
// BILLING_ISSUE est exclu : RevenueCat a une grace period, EXPIRATION suit si non résolu
const REVOKE_EVENTS = new Set([
  "EXPIRATION",
  "SUBSCRIPTION_PAUSED",
]);

// Comparaison en temps constant pour éviter les timing attacks sur le secret
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // Valider le secret RevenueCat (header Authorization = secret configuré dans le dashboard RC)
  const expectedSecret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET") ?? "";
  const authHeader = req.headers.get("Authorization") ?? "";

  if (!expectedSecret || !safeEqual(authHeader, expectedSecret)) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const event = (body as Record<string, unknown>)?.event;
  if (!event || typeof event !== "object") {
    return new Response("Bad Request", { status: 400 });
  }

  const { type: eventType, app_user_id: appUserId } =
    event as Record<string, unknown>;

  if (typeof eventType !== "string" || typeof appUserId !== "string") {
    return new Response("Bad Request", { status: 400 });
  }

  // app_user_id doit être un UUID Supabase — sinon c'est un event test ou mal configuré
  if (!UUID_REGEX.test(appUserId)) {
    return new Response("OK", { status: 200 });
  }

  let premiumValue: boolean | null = null;
  if (PREMIUM_EVENTS.has(eventType)) premiumValue = true;
  else if (REVOKE_EVENTS.has(eventType)) premiumValue = false;

  // Événement non géré (CANCELLATION, BILLING_ISSUE, TEST, etc.) — on acquitte sans action
  if (premiumValue === null) {
    return new Response("OK", { status: 200 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const { error } = await supabase.rpc("set_user_premium", {
    target_user_id: appUserId,
    premium_value: premiumValue,
  });

  if (error) {
    // Log sans données personnelles
    console.error("set_user_premium failed:", error.code);
    return new Response("Internal Server Error", { status: 500 });
  }

  return new Response("OK", { status: 200 });
});
