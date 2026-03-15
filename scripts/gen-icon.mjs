/**
 * Generates Plans app icons — clean, enterprise-grade
 * Design: Near-black background, gold abstract "P" mark built from geometric shapes
 * Run: node scripts/gen-icon.mjs
 */
import Jimp from "jimp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../public");

const DARK   = 0x0D0D0DFF;
const AMBER  = 0xF59E0BFF;
const AMBER2 = 0xFBBF24FF; // lighter amber for gradient effect

function lerp(a, b, t) { return Math.round(a + (b - a) * t); }

// Draw a filled rounded-rectangle into the image
function fillRoundRect(img, x, y, w, h, r, color) {
    for (let py = y; py < y + h; py++) {
        for (let px = x; px < x + w; px++) {
            // Corner check
            const inCornerTL = px < x + r && py < y + r;
            const inCornerTR = px >= x + w - r && py < y + r;
            const inCornerBL = px < x + r && py >= y + h - r;
            const inCornerBR = px >= x + w - r && py >= y + h - r;

            let inside = true;
            if (inCornerTL) {
                const dx = px - (x + r), dy = py - (y + r);
                inside = dx * dx + dy * dy <= r * r;
            } else if (inCornerTR) {
                const dx = px - (x + w - r - 1), dy = py - (y + r);
                inside = dx * dx + dy * dy <= r * r;
            } else if (inCornerBL) {
                const dx = px - (x + r), dy = py - (y + h - r - 1);
                inside = dx * dx + dy * dy <= r * r;
            } else if (inCornerBR) {
                const dx = px - (x + w - r - 1), dy = py - (y + h - r - 1);
                inside = dx * dx + dy * dy <= r * r;
            }
            if (inside) img.setPixelColor(color, px, py);
        }
    }
}

// Draw a filled circle
function fillCircle(img, cx, cy, radius, color) {
    for (let y = cy - radius; y <= cy + radius; y++) {
        for (let x = cx - radius; x <= cx + radius; x++) {
            if ((x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2) {
                img.setPixelColor(color, x, y);
            }
        }
    }
}

async function generateIcon(size, outputPath) {
    const img = await Jimp.create(size, size, DARK);

    const s = size / 512;

    // ── Subtle warm gradient tint on background (top-left corner glow) ──
    for (let y = 0; y < size * 0.5; y++) {
        for (let x = 0; x < size * 0.5; x++) {
            const dist = Math.sqrt(x * x + y * y) / (size * 0.5);
            if (dist < 1) {
                const t = (1 - dist) * 0.07; // very subtle
                const r = lerp(0x0D, 0x1A, t);
                const g = lerp(0x0D, 0x10, t);
                const b = lerp(0x0D, 0x0D, t);
                img.setPixelColor(
                    (r << 24) | (g << 16) | (b << 8) | 0xFF,
                    x, y
                );
            }
        }
    }

    // ── The "P" mark — geometric construction ──
    // Total mark height: ~56% of icon, centered
    const markH = Math.round(280 * s);
    const markW = Math.round(220 * s);
    const markX = Math.round((size - markW) / 2);
    const markY = Math.round((size - markH) / 2);

    const strokeW  = Math.round(52 * s);   // stroke width
    const bowlH    = Math.round(148 * s);  // bowl height
    const bowlW    = markW;
    const cornerR  = Math.round(26 * s);   // inner rounding

    // Vertical stem
    fillRoundRect(img, markX, markY, strokeW, markH, Math.round(cornerR * 0.6), AMBER);

    // Bowl top bar
    fillRoundRect(img, markX, markY, bowlW, strokeW, cornerR, AMBER);

    // Bowl right bar
    fillRoundRect(img, markX + bowlW - strokeW, markY, strokeW, bowlH, cornerR, AMBER);

    // Bowl bottom bar (mid-bar of P)
    fillRoundRect(img, markX, markY + bowlH - strokeW, bowlW, strokeW, cornerR, AMBER);

    // ── Accent dot — lower right of stem, adds visual interest ──
    const dotR  = Math.round(22 * s);
    const dotCX = markX + strokeW + Math.round(14 * s) + dotR;
    const dotCY = markY + bowlH + Math.round(52 * s) + dotR;
    if (dotCY + dotR < markY + markH + Math.round(20 * s)) {
        fillCircle(img, dotCX, dotCY, dotR, AMBER2);
    }

    await img.write(outputPath);
    console.log(`✓ ${outputPath} (${size}x${size})`);
}

// Generate all needed sizes
await generateIcon(512, path.join(OUT, "icon-512x512.png"));
await generateIcon(192, path.join(OUT, "icon-192x192.png"));
await generateIcon(180, path.join(OUT, "apple-icon.png"));

console.log("\nDone — app icons generated.");
