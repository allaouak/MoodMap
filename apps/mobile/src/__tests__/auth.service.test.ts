jest.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
    },
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

import { authService } from "../services/auth.service";
import { supabase } from "../lib/supabase";

const authMock = supabase.auth as jest.Mocked<typeof supabase.auth>;
const fromMock = supabase.from as jest.Mock;
const rpcMock = supabase.rpc as jest.Mock;

beforeEach(() => jest.clearAllMocks());

// ─── signUp ───────────────────────────────────────────────────────────────────

describe("authService.signUp", () => {
  it("retourne requiresConfirmation=false quand une session est créée", async () => {
    authMock.signUp.mockResolvedValue({
      data: { user: { id: "u1" }, session: { access_token: "tok" } },
      error: null,
    } as never);

    const result = await authService.signUp("a@b.com", "Password1", "Alice");
    expect(result.requiresConfirmation).toBe(false);
  });

  it("retourne requiresConfirmation=true quand aucune session n'est retournée", async () => {
    authMock.signUp.mockResolvedValue({
      data: { user: { id: "u1" }, session: null },
      error: null,
    } as never);

    const result = await authService.signUp("a@b.com", "Password1", "Alice");
    expect(result.requiresConfirmation).toBe(true);
  });

  it("transmet le display_name dans les options", async () => {
    authMock.signUp.mockResolvedValue({
      data: { session: { access_token: "tok" } },
      error: null,
    } as never);

    await authService.signUp("a@b.com", "Password1", "Alice");
    expect(authMock.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "a@b.com",
        password: "Password1",
        options: { data: { display_name: "Alice" } },
      })
    );
  });

  it("lève une exception si Supabase retourne une erreur", async () => {
    authMock.signUp.mockResolvedValue({
      data: { session: null },
      error: { message: "Email already registered" },
    } as never);

    await expect(authService.signUp("a@b.com", "Password1", "Alice")).rejects.toBeDefined();
  });
});

// ─── signIn ───────────────────────────────────────────────────────────────────

describe("authService.signIn", () => {
  it("retourne les données de session en cas de succès", async () => {
    const sessionData = { user: { id: "u1" }, session: { access_token: "tok" } };
    authMock.signInWithPassword.mockResolvedValue({
      data: sessionData,
      error: null,
    } as never);

    const result = await authService.signIn("a@b.com", "Password1");
    expect(result).toEqual(sessionData);
  });

  it("lève une exception sur identifiants invalides", async () => {
    authMock.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Invalid login credentials" },
    } as never);

    await expect(authService.signIn("a@b.com", "wrong")).rejects.toBeDefined();
  });
});

// ─── signOut ──────────────────────────────────────────────────────────────────

describe("authService.signOut", () => {
  it("appelle supabase.auth.signOut", async () => {
    authMock.signOut.mockResolvedValue({ error: null } as never);
    await authService.signOut();
    expect(authMock.signOut).toHaveBeenCalledTimes(1);
  });

  it("lève une exception si signOut échoue", async () => {
    authMock.signOut.mockResolvedValue({ error: { message: "Network error" } } as never);
    await expect(authService.signOut()).rejects.toBeDefined();
  });
});

// ─── resetPassword ────────────────────────────────────────────────────────────

describe("authService.resetPassword", () => {
  it("appelle resetPasswordForEmail avec le deep link moodmap://", async () => {
    authMock.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null } as never);

    await authService.resetPassword("a@b.com");
    expect(authMock.resetPasswordForEmail).toHaveBeenCalledWith(
      "a@b.com",
      { redirectTo: "moodmap://reset-password" }
    );
  });

  it("lève une exception si l'appel échoue", async () => {
    authMock.resetPasswordForEmail.mockResolvedValue({
      data: {},
      error: { message: "Rate limited" },
    } as never);

    await expect(authService.resetPassword("a@b.com")).rejects.toBeDefined();
  });
});

// ─── updatePassword ───────────────────────────────────────────────────────────

describe("authService.updatePassword", () => {
  it("appelle updateUser avec le nouveau mot de passe", async () => {
    authMock.updateUser.mockResolvedValue({ data: { user: {} }, error: null } as never);
    await authService.updatePassword("NewPassword1");
    expect(authMock.updateUser).toHaveBeenCalledWith({ password: "NewPassword1" });
  });

  it("lève une exception si updateUser échoue", async () => {
    authMock.updateUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Weak password" },
    } as never);

    await expect(authService.updatePassword("short")).rejects.toBeDefined();
  });
});

// ─── confirmPassword ──────────────────────────────────────────────────────────

describe("authService.confirmPassword", () => {
  it("appelle signInWithPassword pour ré-authentifier", async () => {
    authMock.signInWithPassword.mockResolvedValue({
      data: { user: { id: "u1" }, session: {} },
      error: null,
    } as never);

    await authService.confirmPassword("a@b.com", "Password1");
    expect(authMock.signInWithPassword).toHaveBeenCalledWith({
      email: "a@b.com",
      password: "Password1",
    });
  });

  it("lève une exception sur mot de passe incorrect", async () => {
    authMock.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Invalid credentials" },
    } as never);

    await expect(authService.confirmPassword("a@b.com", "wrong")).rejects.toBeDefined();
  });
});

// ─── deleteAccount ────────────────────────────────────────────────────────────

describe("authService.deleteAccount", () => {
  it("appelle la RPC delete_user_account", async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });
    await authService.deleteAccount();
    expect(rpcMock).toHaveBeenCalledWith("delete_user_account");
  });

  it("lève une exception si la RPC échoue", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "RPC error" } });
    await expect(authService.deleteAccount()).rejects.toBeDefined();
  });
});

// ─── getProfile ───────────────────────────────────────────────────────────────

describe("authService.getProfile", () => {
  function buildProfileChain(result: { data: object | null; error: object | null }) {
    const singleMock = jest.fn().mockResolvedValue(result);
    const eqMock = jest.fn(() => ({ single: singleMock }));
    const selectMock = jest.fn(() => ({ eq: eqMock }));
    fromMock.mockReturnValue({ select: selectMock });
    return { singleMock };
  }

  it("retourne le profil quand il existe", async () => {
    const profile = { id: "u1", display_name: "Alice", email: "a@b.com" };
    buildProfileChain({ data: profile, error: null });

    const result = await authService.getProfile("u1");
    expect(result).toEqual(profile);
  });

  it("retourne null quand le profil n'existe pas (PGRST116)", async () => {
    buildProfileChain({ data: null, error: { code: "PGRST116", message: "Not found" } });

    const result = await authService.getProfile("u1");
    expect(result).toBeNull();
  });

  it("lève une exception pour toute autre erreur Supabase", async () => {
    buildProfileChain({ data: null, error: { code: "500", message: "Server error" } });

    await expect(authService.getProfile("u1")).rejects.toBeDefined();
  });
});

// ─── updateProfile ────────────────────────────────────────────────────────────

describe("authService.updateProfile", () => {
  function buildUpdateChain(result: { data: object | null; error: object | null }) {
    const singleMock = jest.fn().mockResolvedValue(result);
    const selectMock = jest.fn(() => ({ single: singleMock }));
    const eqMock = jest.fn(() => ({ select: selectMock }));
    const updateMock = jest.fn(() => ({ eq: eqMock }));
    fromMock.mockReturnValue({ update: updateMock });
    return { updateMock, singleMock };
  }

  it("met à jour et retourne le profil modifié", async () => {
    const updated = { id: "u1", display_name: "Bob", timezone: "Europe/Paris" };
    buildUpdateChain({ data: updated, error: null });

    const result = await authService.updateProfile("u1", { display_name: "Bob" });
    expect(result).toEqual(updated);
  });

  it("inclut updated_at dans le payload", async () => {
    const { updateMock } = buildUpdateChain({ data: { id: "u1" }, error: null });

    await authService.updateProfile("u1", { display_name: "Bob" });
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ updated_at: expect.any(String) })
    );
  });

  it("lève une exception si Supabase retourne une erreur", async () => {
    buildUpdateChain({ data: null, error: { message: "RLS violation" } });

    await expect(authService.updateProfile("u1", { display_name: "Bob" })).rejects.toBeDefined();
  });
});
