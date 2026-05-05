const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const OUT_DIR = path.join(__dirname, "..", "assets", "images");
const IOS_ASSETS_DIR = path.join(__dirname, "..", "ios", "MoodMap", "Images.xcassets");

const COLORS = {
  purple:   [109, 40, 217],   // #6D28D9
  purple2:  [139, 92, 246],   // #8B5CF6
  purple3:  [91, 33, 182],    // #5B21B6
  slate:    [100, 116, 139],  // #64748B
  rose:     [251, 113, 133],  // #FB7185
  cyan:     [34, 211, 238],   // #22D3EE
  lavender: [248, 244, 255],  // #F8F4FF
  lavender2:[237, 229, 255],  // #EDE5FF
  cheek:    [233, 213, 255],  // #E9D5FF
  white:    [255, 255, 255],
  ink:      [31, 41, 55],     // #1F2937
  mint:     [52, 211, 153],   // #34D399
};

function rgba(color, alpha = 255) {
  return [color[0], color[1], color[2], alpha];
}

function makeCanvas(size, transparent = false, background = COLORS.lavender) {
  const png = new PNG({ width: size, height: size, colorType: 6 });
  const color = transparent ? [0, 0, 0, 0] : rgba(background);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      setPixel(png, x, y, color);
    }
  }
  return png;
}

function setPixel(png, x, y, color) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const idx = (png.width * y + x) << 2;
  png.data[idx]     = color[0];
  png.data[idx + 1] = color[1];
  png.data[idx + 2] = color[2];
  png.data[idx + 3] = color[3];
}

function blendPixel(png, x, y, src) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const idx = (png.width * y + x) << 2;
  const a = src[3] / 255;
  const inv = 1 - a;
  png.data[idx]     = Math.round(src[0] * a + png.data[idx]     * inv);
  png.data[idx + 1] = Math.round(src[1] * a + png.data[idx + 1] * inv);
  png.data[idx + 2] = Math.round(src[2] * a + png.data[idx + 2] * inv);
  png.data[idx + 3] = Math.round(src[3]     + png.data[idx + 3] * inv);
}

function fillCircle(png, cx, cy, radius, color) {
  const r2 = radius * radius;
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y += 1) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x += 1) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= r2) blendPixel(png, x, y, color);
    }
  }
}

function fillRoundedRect(png, x0, y0, w, h, radius, color) {
  const x1 = x0 + w;
  const y1 = y0 + h;
  for (let y = Math.floor(y0); y < Math.ceil(y1); y += 1) {
    for (let x = Math.floor(x0); x < Math.ceil(x1); x += 1) {
      const px = x + 0.5;
      const py = y + 0.5;
      const cx = Math.max(x0 + radius, Math.min(px, x1 - radius));
      const cy = Math.max(y0 + radius, Math.min(py, y1 - radius));
      const dx = px - cx;
      const dy = py - cy;
      if (dx * dx + dy * dy <= radius * radius) blendPixel(png, x, y, color);
    }
  }
}

function strokeCircle(png, cx, cy, radius, width, color) {
  const outer = radius + width / 2;
  const inner = radius - width / 2;
  for (let y = Math.floor(cy - outer); y <= Math.ceil(cy + outer); y += 1) {
    for (let x = Math.floor(cx - outer); x <= Math.ceil(cx + outer); x += 1) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d <= outer && d >= inner) blendPixel(png, x, y, color);
    }
  }
}

function strokeLine(png, x0, y0, x1, y1, width, color) {
  const minX = Math.floor(Math.min(x0, x1) - width);
  const maxX = Math.ceil(Math.max(x0, x1) + width);
  const minY = Math.floor(Math.min(y0, y1) - width);
  const maxY = Math.ceil(Math.max(y0, y1) + width);
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len2 = dx * dx + dy * dy;
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const t = Math.max(0, Math.min(1, ((x + 0.5 - x0) * dx + (y + 0.5 - y0) * dy) / len2));
      const px = x0 + t * dx;
      const py = y0 + t * dy;
      const dist = Math.hypot(x + 0.5 - px, y + 0.5 - py);
      if (dist <= width / 2) blendPixel(png, x, y, color);
    }
  }
}

function strokeArc(png, cx, cy, radius, start, end, width, color) {
  const steps = Math.max(48, Math.ceil(Math.abs(end - start) * radius / 4));
  let prev = null;
  for (let i = 0; i <= steps; i += 1) {
    const t = start + (end - start) * (i / steps);
    const point = [cx + Math.cos(t) * radius, cy + Math.sin(t) * radius];
    if (prev) strokeLine(png, prev[0], prev[1], point[0], point[1], width, color);
    prev = point;
  }
}

// ─── Arrière-plan dégradé violet ───────────────────────────────────────────

function drawGradientBackground(png) {
  const { width, height } = png;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const t = (x + y) / (width + height);
      const r = Math.round(COLORS.purple[0] * (1 - t) + COLORS.purple2[0] * t);
      const g = Math.round(COLORS.purple[1] * (1 - t) + COLORS.purple2[1] * t);
      const b = Math.round(COLORS.purple[2] * (1 - t) + COLORS.purple2[2] * t);
      setPixel(png, x, y, [r, g, b, 255]);
    }
  }
  // Reflets larges, assez calmes pour rester premium à taille iOS.
  fillCircle(png, width * 0.18, height * 0.10, width * 0.46, rgba(COLORS.white, 24));
  fillCircle(png, width * 0.88, height * 0.86, width * 0.50, [31, 41, 55, 22]);
}

// ─── Logo MoodMap ───────────────────────────────────────────────────────────
//
// Le symbole combine :
// - un visage doux, cohérent avec le composant MoodFaceIcon
// - une boussole d'humeur segmentée, inspirée des cadrans émotionnels
// - une lecture "carte intérieure" sans codes de performance.

function drawMoodMapMark(png, cx, cy, scale, withTile = true) {
  const ringRadius = 288 * scale;
  const ringWidth = 76 * scale;
  const faceRadius = 184 * scale;

  // Ombre douce de l'ensemble.
  fillCircle(png, cx + 16 * scale, cy + 24 * scale, 324 * scale, rgba(COLORS.ink, 24));

  // Anneau de fond, puis trois segments pour les variations d'humeur.
  strokeCircle(png, cx, cy, ringRadius, ringWidth, rgba(COLORS.white, 235));
  strokeArc(png, cx, cy, ringRadius, -1.48, -0.12, ringWidth, rgba(COLORS.cyan, 245));
  strokeArc(png, cx, cy, ringRadius, 0.26, 2.05, ringWidth, rgba(COLORS.purple2, 245));
  strokeArc(png, cx, cy, ringRadius, 2.42, 3.92, ringWidth, rgba(COLORS.rose, 245));
  strokeArc(png, cx, cy, ringRadius, 4.20, 4.70, ringWidth, rgba(COLORS.mint, 235));

  // Petite route intérieure, pour l'idée de "map" sans surcharger.
  strokeArc(png, cx - 8 * scale, cy + 8 * scale, 232 * scale, 0.72, 2.25, 15 * scale, rgba(COLORS.white, 160));
  strokeArc(png, cx + 2 * scale, cy + 4 * scale, 222 * scale, -0.58, 0.25, 13 * scale, rgba(COLORS.white, 120));

  if (withTile) {
    fillCircle(png, cx + 8 * scale, cy + 12 * scale, faceRadius, rgba(COLORS.purple3, 44));
    fillCircle(png, cx, cy, faceRadius, rgba(COLORS.lavender, 255));
    strokeCircle(png, cx, cy, faceRadius, 13 * scale, rgba(COLORS.white, 255));
  }

  // Visage MoodMap level 5.
  fillCircle(png, cx - 54 * scale, cy - 36 * scale, 17 * scale, rgba(COLORS.slate, 255));
  fillCircle(png, cx + 54 * scale, cy - 36 * scale, 17 * scale, rgba(COLORS.slate, 255));
  fillCircle(png, cx - 92 * scale, cy + 16 * scale, 20 * scale, rgba(COLORS.cheek, 220));
  fillCircle(png, cx + 92 * scale, cy + 16 * scale, 20 * scale, rgba(COLORS.cheek, 220));
  strokeArc(png, cx, cy - 12 * scale, 94 * scale, 0.44, 2.70, 19 * scale, rgba(COLORS.slate, 255));

  // Repère discret façon "position du jour".
  fillCircle(png, cx + 186 * scale, cy - 168 * scale, 28 * scale, rgba(COLORS.white, 255));
  fillCircle(png, cx + 186 * scale, cy - 168 * scale, 16 * scale, rgba(COLORS.mint, 255));
}

// ─── Fonctions de sortie ────────────────────────────────────────────────────

function downsample(src, size) {
  const scale = src.width / size;
  const out = new PNG({ width: size, height: size, colorType: 6 });
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const acc = [0, 0, 0, 0];
      for (let sy = 0; sy < scale; sy += 1) {
        for (let sx = 0; sx < scale; sx += 1) {
          const idx = (src.width * (y * scale + sy) + (x * scale + sx)) << 2;
          acc[0] += src.data[idx];
          acc[1] += src.data[idx + 1];
          acc[2] += src.data[idx + 2];
          acc[3] += src.data[idx + 3];
        }
      }
      const count = scale * scale;
      setPixel(out, x, y, acc.map((v) => Math.round(v / count)));
    }
  }
  return out;
}

function savePng(png, file) {
  fs.writeFileSync(path.join(OUT_DIR, file), PNG.sync.write(png));
}

function savePngAt(png, file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, PNG.sync.write(png));
}

// ─── Générateurs ────────────────────────────────────────────────────────────

function generateIcon(file, size, transparent = false) {
  const high = makeCanvas(size * 3, transparent);
  if (!transparent) drawGradientBackground(high);
  // Keep the mark inside a conservative safe area. Expo update/dev screens can
  // display the raw square icon without the iOS rounded mask.
  drawMoodMapMark(high, high.width / 2, high.height / 2 - high.height * 0.005, high.width / 1280, true);
  savePng(downsample(high, size), file);
}

function generateSplash() {
  const high = makeCanvas(1536, true);
  drawMoodMapMark(high, high.width / 2, high.height / 2, high.width / 1850, true);
  savePng(downsample(high, 512), "splash-icon.png");
}

function generateIosAssets() {
  // AppIcon 1024×1024
  const icon = makeCanvas(1024 * 3, false);
  drawGradientBackground(icon);
  drawMoodMapMark(icon, icon.width / 2, icon.height / 2 - icon.height * 0.005, icon.width / 1280, true);
  savePngAt(
    downsample(icon, 1024),
    path.join(IOS_ASSETS_DIR, "AppIcon.appiconset", "App-Icon-1024x1024@1x.png")
  );

  // Splash screen legacy (Expo)
  const splash = makeCanvas(444 * 3, true);
  drawMoodMapMark(splash, splash.width / 2, splash.height / 2, splash.width / 535, true);
  const splashSet = path.join(IOS_ASSETS_DIR, "SplashScreenLegacy.imageset");
  savePngAt(downsample(splash, 148), path.join(splashSet, "image.png"));
  savePngAt(downsample(splash, 296), path.join(splashSet, "image@2x.png"));
  savePngAt(downsample(splash, 444), path.join(splashSet, "image@3x.png"));
}

// ─── Exécution ──────────────────────────────────────────────────────────────

fs.mkdirSync(OUT_DIR, { recursive: true });
generateIcon("icon.png",          1024, false);
generateIcon("adaptive-icon.png", 1024, true);
generateIcon("favicon.png",        128, false);
generateSplash();
generateIosAssets();

console.log("✓ Assets générés dans", OUT_DIR);
