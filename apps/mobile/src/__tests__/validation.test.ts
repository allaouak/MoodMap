import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  checkInSchema,
} from "../lib/validation";

// ─── loginSchema ────────────────────────────────────────────────────────────

describe("loginSchema", () => {
  it("accepte un email et un mot de passe valides", () => {
    expect(loginSchema.safeParse({ email: "user@example.com", password: "secret123" }).success).toBe(true);
  });

  it("rejette un email malformé", () => {
    expect(loginSchema.safeParse({ email: "pas-un-email", password: "secret123" }).success).toBe(false);
  });

  it("rejette un mot de passe de moins de 8 caractères", () => {
    expect(loginSchema.safeParse({ email: "user@example.com", password: "1234567" }).success).toBe(false);
  });
});

// ─── registerSchema ─────────────────────────────────────────────────────────

describe("registerSchema", () => {
  const valid = {
    displayName: "Alice",
    email: "alice@example.com",
    password: "Secret123",
    confirmPassword: "Secret123",
  };

  it("accepte des données valides", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("rejette un displayName trop court", () => {
    expect(registerSchema.safeParse({ ...valid, displayName: "A" }).success).toBe(false);
  });

  it("rejette un displayName trop long", () => {
    expect(registerSchema.safeParse({ ...valid, displayName: "A".repeat(51) }).success).toBe(false);
  });

  it("rejette un mot de passe sans majuscule", () => {
    expect(registerSchema.safeParse({ ...valid, password: "secret123", confirmPassword: "secret123" }).success).toBe(false);
  });

  it("rejette un mot de passe sans chiffre", () => {
    expect(registerSchema.safeParse({ ...valid, password: "SecretABC", confirmPassword: "SecretABC" }).success).toBe(false);
  });

  it("rejette si les mots de passe ne correspondent pas", () => {
    expect(registerSchema.safeParse({ ...valid, confirmPassword: "Autre123" }).success).toBe(false);
  });
});

// ─── forgotPasswordSchema ───────────────────────────────────────────────────

describe("forgotPasswordSchema", () => {
  it("accepte un email valide", () => {
    expect(forgotPasswordSchema.safeParse({ email: "user@example.com" }).success).toBe(true);
  });

  it("rejette un email vide", () => {
    expect(forgotPasswordSchema.safeParse({ email: "" }).success).toBe(false);
  });

  it("rejette un email malformé", () => {
    expect(forgotPasswordSchema.safeParse({ email: "pas-un-email" }).success).toBe(false);
  });
});

// ─── resetPasswordSchema ────────────────────────────────────────────────────

describe("resetPasswordSchema", () => {
  const valid = { password: "Secret123", confirmPassword: "Secret123" };

  it("accepte un mot de passe fort et confirmé", () => {
    expect(resetPasswordSchema.safeParse(valid).success).toBe(true);
  });

  it("rejette si les mots de passe ne correspondent pas", () => {
    expect(resetPasswordSchema.safeParse({ ...valid, confirmPassword: "Autre123" }).success).toBe(false);
  });

  it("rejette un mot de passe sans majuscule", () => {
    expect(resetPasswordSchema.safeParse({ password: "secret123", confirmPassword: "secret123" }).success).toBe(false);
  });

  it("rejette un mot de passe sans chiffre", () => {
    expect(resetPasswordSchema.safeParse({ password: "SecretABC", confirmPassword: "SecretABC" }).success).toBe(false);
  });
});

// ─── checkInSchema ──────────────────────────────────────────────────────────

describe("checkInSchema", () => {
  const valid = { mood: 3, energy: 4, stress: 2 };

  it("accepte des valeurs valides", () => {
    expect(checkInSchema.safeParse(valid).success).toBe(true);
  });

  it("accepte une note optionnelle", () => {
    expect(checkInSchema.safeParse({ ...valid, note: "Bonne journée" }).success).toBe(true);
  });

  it("accepte l'absence de note", () => {
    expect(checkInSchema.safeParse(valid).success).toBe(true);
  });

  it("rejette une humeur hors borne supérieure", () => {
    expect(checkInSchema.safeParse({ ...valid, mood: 6 }).success).toBe(false);
  });

  it("rejette une humeur hors borne inférieure", () => {
    expect(checkInSchema.safeParse({ ...valid, mood: 0 }).success).toBe(false);
  });

  it("rejette une énergie hors bornes", () => {
    expect(checkInSchema.safeParse({ ...valid, energy: 6 }).success).toBe(false);
  });

  it("rejette un stress hors bornes", () => {
    expect(checkInSchema.safeParse({ ...valid, stress: 0 }).success).toBe(false);
  });

  it("rejette une note dépassant 500 caractères", () => {
    expect(checkInSchema.safeParse({ ...valid, note: "a".repeat(501) }).success).toBe(false);
  });

  it("accepte exactement 500 caractères", () => {
    expect(checkInSchema.safeParse({ ...valid, note: "a".repeat(500) }).success).toBe(true);
  });

  it("accepte des tags valides", () => {
    expect(checkInSchema.safeParse({ ...valid, tags: ["travail", "sport"] }).success).toBe(true);
  });

  it("accepte l'absence de tags", () => {
    expect(checkInSchema.safeParse(valid).success).toBe(true);
  });

  it("rejette plus de 10 tags", () => {
    const tags = Array.from({ length: 11 }, (_, i) => `tag${i}`);
    expect(checkInSchema.safeParse({ ...valid, tags }).success).toBe(false);
  });

  it("rejette un tag vide", () => {
    expect(checkInSchema.safeParse({ ...valid, tags: [""] }).success).toBe(false);
  });

  it("rejette un tag dépassant 30 caractères", () => {
    expect(checkInSchema.safeParse({ ...valid, tags: ["a".repeat(31)] }).success).toBe(false);
  });

  it("accepte exactement 10 tags", () => {
    const tags = Array.from({ length: 10 }, (_, i) => `tag${i}`);
    expect(checkInSchema.safeParse({ ...valid, tags }).success).toBe(true);
  });
});
