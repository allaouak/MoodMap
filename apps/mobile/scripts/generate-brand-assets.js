const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const OUT_DIR = path.join(__dirname, "..", "assets", "images");
const IOS_ASSETS_DIR = path.join(__dirname, "..", "ios", "MoodMap", "Images.xcassets");

const COLORS = {
  purple: [109, 40, 217],
  purple2: [139, 92, 246],
  lavender: [248, 244, 255],
  lavender2: [237, 229, 255],
  white: [255, 255, 255],
  ink: [31, 41, 55],
  blue: [96, 165, 250],
  green: [52, 211, 153],
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
  png.data[idx] = color[0];
  png.data[idx + 1] = color[1];
  png.data[idx + 2] = color[2];
  png.data[idx + 3] = color[3];
}

function blendPixel(png, x, y, src) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const idx = (png.width * y + x) << 2;
  const a = src[3] / 255;
  const inv = 1 - a;
  png.data[idx] = Math.round(src[0] * a + png.data[idx] * inv);
  png.data[idx + 1] = Math.round(src[1] * a + png.data[idx + 1] * inv);
  png.data[idx + 2] = Math.round(src[2] * a + png.data[idx + 2] * inv);
  png.data[idx + 3] = Math.round(src[3] + png.data[idx + 3] * inv);
}

function fillRect(png, x0, y0, w, h, color) {
  for (let y = y0; y < y0 + h; y += 1) {
    for (let x = x0; x < x0 + w; x += 1) blendPixel(png, x, y, color);
  }
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
  const steps = Math.max(24, Math.ceil(Math.abs(end - start) * radius / 8));
  let prev = null;
  for (let i = 0; i <= steps; i += 1) {
    const t = start + (end - start) * (i / steps);
    const point = [cx + Math.cos(t) * radius, cy + Math.sin(t) * radius];
    if (prev) strokeLine(png, prev[0], prev[1], point[0], point[1], width, color);
    prev = point;
  }
}

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
  fillCircle(png, width * 0.22, height * 0.16, width * 0.42, rgba(COLORS.white, 28));
  fillCircle(png, width * 0.88, height * 0.84, width * 0.46, rgba(COLORS.ink, 24));
}

function drawMoodMapMark(png, cx, cy, scale, withTile = false) {
  if (withTile) {
    fillRoundedRect(png, cx - 220 * scale, cy - 220 * scale, 440 * scale, 440 * scale, 118 * scale, rgba(COLORS.white, 234));
    strokeCircle(png, cx, cy - 14 * scale, 128 * scale, 16 * scale, rgba(COLORS.purple, 210));
  } else {
    fillCircle(png, cx, cy - 14 * scale, 158 * scale, rgba(COLORS.white, 242));
    strokeCircle(png, cx, cy - 14 * scale, 116 * scale, 12 * scale, rgba(COLORS.purple, 215));
  }

  fillCircle(png, cx - 46 * scale, cy - 38 * scale, 13 * scale, rgba(COLORS.ink, 210));
  fillCircle(png, cx + 46 * scale, cy - 38 * scale, 13 * scale, rgba(COLORS.ink, 210));
  fillCircle(png, cx - 72 * scale, cy + 18 * scale, 16 * scale, rgba(COLORS.purple2, 110));
  fillCircle(png, cx + 72 * scale, cy + 18 * scale, 16 * scale, rgba(COLORS.purple2, 110));
  strokeArc(png, cx, cy - 8 * scale, 72 * scale, 0.22 * Math.PI, 0.78 * Math.PI, 13 * scale, rgba(COLORS.ink, 220));

  const y = cy + 156 * scale;
  strokeLine(png, cx - 132 * scale, y, cx - 42 * scale, y - 42 * scale, 16 * scale, rgba(COLORS.blue, 230));
  strokeLine(png, cx - 42 * scale, y - 42 * scale, cx + 44 * scale, y - 6 * scale, 16 * scale, rgba(COLORS.green, 230));
  strokeLine(png, cx + 44 * scale, y - 6 * scale, cx + 132 * scale, y - 62 * scale, 16 * scale, rgba(COLORS.white, 230));
  fillCircle(png, cx - 132 * scale, y, 21 * scale, rgba(COLORS.blue, 255));
  fillCircle(png, cx - 42 * scale, y - 42 * scale, 21 * scale, rgba(COLORS.green, 255));
  fillCircle(png, cx + 44 * scale, y - 6 * scale, 21 * scale, rgba(COLORS.white, 255));
  fillCircle(png, cx + 132 * scale, y - 62 * scale, 21 * scale, rgba(COLORS.lavender2, 255));
}

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

function generateIcon(file, size, transparent = false) {
  const high = makeCanvas(size * 3, transparent);
  if (!transparent) drawGradientBackground(high);
  drawMoodMapMark(high, high.width / 2, high.height / 2 - high.height * 0.02, high.width / 1024, transparent);
  savePng(downsample(high, size), file);
}

function generateSplash() {
  const high = makeCanvas(1536, true);
  drawMoodMapMark(high, high.width / 2, high.height / 2 - 30, 1.65, false);
  savePng(downsample(high, 512), "splash-icon.png");
}

function generateIosAssets() {
  const icon = makeCanvas(1024 * 3, false);
  drawGradientBackground(icon);
  drawMoodMapMark(icon, icon.width / 2, icon.height / 2 - icon.height * 0.02, icon.width / 1024, false);
  savePngAt(
    downsample(icon, 1024),
    path.join(IOS_ASSETS_DIR, "AppIcon.appiconset", "App-Icon-1024x1024@1x.png")
  );

  const splash = makeCanvas(444 * 3, true);
  drawMoodMapMark(splash, splash.width / 2, splash.height / 2 - 18, splash.width / 760, false);
  const splashSet = path.join(IOS_ASSETS_DIR, "SplashScreenLegacy.imageset");
  savePngAt(downsample(splash, 148), path.join(splashSet, "image.png"));
  savePngAt(downsample(splash, 296), path.join(splashSet, "image@2x.png"));
  savePngAt(downsample(splash, 444), path.join(splashSet, "image@3x.png"));
}

fs.mkdirSync(OUT_DIR, { recursive: true });
generateIcon("icon.png", 1024, false);
generateIcon("adaptive-icon.png", 1024, true);
generateIcon("favicon.png", 128, false);
generateSplash();
generateIosAssets();
