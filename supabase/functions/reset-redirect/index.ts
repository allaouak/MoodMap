import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Valide le format du code PKCE (même règle que dans _layout.tsx)
const PKCE_CODE_RE = /^[A-Za-z0-9._~-]{10,512}$/;

const html = (code: string) => `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>MoodMap — Réinitialisation</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #F8F4FF;
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: #ffffff;
      border-radius: 24px;
      padding: 40px 32px;
      max-width: 380px;
      width: 100%;
      text-align: center;
      box-shadow: 0 4px 24px rgba(30, 8, 87, 0.08);
    }
    .logo {
      font-size: 40px;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 20px;
      font-weight: 700;
      color: #1F2937;
      margin-bottom: 8px;
    }
    p {
      font-size: 15px;
      color: #6B7280;
      line-height: 1.5;
      margin-bottom: 32px;
    }
    .btn {
      display: block;
      background: #6D28D9;
      color: #ffffff;
      font-size: 16px;
      font-weight: 600;
      text-decoration: none;
      padding: 16px 24px;
      border-radius: 16px;
      transition: opacity 0.15s;
    }
    .btn:active { opacity: 0.85; }
    .note {
      margin-top: 16px;
      font-size: 13px;
      color: #9CA3AF;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">🗺️</div>
    <h1>Réinitialise ton mot de passe</h1>
    <p>Appuie sur le bouton ci-dessous pour ouvrir MoodMap et choisir ton nouveau mot de passe.</p>
    <a class="btn" href="moodmap://reset-password?code=${encodeURIComponent(code)}">
      Ouvrir MoodMap
    </a>
    <p class="note">Si l'app ne s'ouvre pas, assure-toi que MoodMap est installé.</p>
  </div>
</body>
</html>`;

serve(async (req: Request) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code") ?? "";

  if (!PKCE_CODE_RE.test(code)) {
    return new Response("Lien invalide ou expiré.", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return new Response(html(code), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Pas de cache — le code PKCE est à usage unique
      "Cache-Control": "no-store",
    },
  });
});
