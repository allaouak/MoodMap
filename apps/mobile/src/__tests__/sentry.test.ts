jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
}));

import { scrubRecursive, scrubString } from "../lib/sentry";

// ─── scrubRecursive ───────────────────────────────────────────────────────────

describe("scrubRecursive — anti-fuite PII", () => {
  it("filtre les clés sensibles au premier niveau", () => {
    const result = scrubRecursive({ mood: 4, note: "Je suis stressé", energy: 3 });
    expect(result).toEqual({ mood: "[Filtered]", note: "[Filtered]", energy: "[Filtered]" });
  });

  it("ne touche pas les clés non sensibles", () => {
    const result = scrubRecursive({ level: "error", message: "crash", timestamp: 123 });
    expect(result).toEqual({ level: "error", message: "crash", timestamp: 123 });
  });

  it("filtre les clés sensibles dans un objet imbriqué", () => {
    const result = scrubRecursive({ context: { note: "secret", other: "ok" } }) as Record<string, Record<string, unknown>>;
    expect(result.context?.note).toBe("[Filtered]");
    expect(result.context?.other).toBe("ok");
  });

  it("filtre dans les tableaux", () => {
    const result = scrubRecursive({ items: [{ note: "a" }, { note: "b" }] }) as Record<string, Array<Record<string, unknown>>>;
    expect(result.items?.[0]?.note).toBe("[Filtered]");
    expect(result.items?.[1]?.note).toBe("[Filtered]");
  });

  it("filtre email, tokens et sub", () => {
    const result = scrubRecursive({
      email: "user@example.com",
      access_token: "abc",
      refresh_token: "xyz",
      sub: "user-id",
      code: "pkce",
    });
    expect(result).toEqual({
      email: "[Filtered]",
      access_token: "[Filtered]",
      refresh_token: "[Filtered]",
      sub: "[Filtered]",
      code: "[Filtered]",
    });
  });

  it("filtre les clés sensibles à profondeur 3", () => {
    const result = scrubRecursive({ a: { b: { note: "deep secret" } } }) as Record<string, Record<string, Record<string, unknown>>>;
    expect(result.a?.b?.note).toBe("[Filtered]");
  });

  it("gère null sans erreur", () => {
    expect(scrubRecursive(null)).toBeNull();
  });

  it("gère les primitives sans erreur", () => {
    expect(scrubRecursive("string")).toBe("string");
    expect(scrubRecursive(42)).toBe(42);
    expect(scrubRecursive(true)).toBe(true);
  });

  it("arrête la récursion à profondeur maximale sans stack overflow", () => {
    let obj: Record<string, unknown> = { note: "leaf" };
    for (let i = 0; i < 10; i++) obj = { nested: obj };
    expect(() => scrubRecursive(obj)).not.toThrow();
  });

  it("renvoie [Filtered] au-delà de la profondeur maximale", () => {
    let obj: Record<string, unknown> = { safe: "value" };
    for (let i = 0; i < 8; i++) obj = { nested: obj };
    const result = scrubRecursive(obj);
    expect(JSON.stringify(result)).toContain('"[Filtered]"');
    expect(result).not.toBe("[Filtered]");
  });
});

// ─── scrubString ─────────────────────────────────────────────────────────────

describe("scrubString — redaction PII dans texte libre", () => {
  it("redacte les emails dans un message d'erreur", () => {
    expect(scrubString("Erreur pour user@example.com")).toBe("Erreur pour [Filtered]");
  });

  it("redacte les UUIDs", () => {
    expect(scrubString("user_id: 550e8400-e29b-41d4-a716-446655440000")).toBe("user_id: [Filtered]");
  });

  it("redacte les JWTs", () => {
    const jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIn0.abc";
    expect(scrubString(`token: ${jwt}`)).toBe("token: [Filtered]");
  });

  it("redacte plusieurs PII dans une même chaîne", () => {
    const msg = "Échec pour user@test.com avec id 550e8400-e29b-41d4-a716-446655440000";
    const result = scrubString(msg);
    expect(result).not.toContain("user@test.com");
    expect(result).not.toContain("550e8400");
    expect(result).toContain("[Filtered]");
  });

  it("laisse les chaînes sans PII intactes", () => {
    expect(scrubString("Impossible de charger le calendrier")).toBe("Impossible de charger le calendrier");
  });

  it("gère une chaîne vide sans erreur", () => {
    expect(scrubString("")).toBe("");
  });
});
