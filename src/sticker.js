// Sticker geometry and encoding rules. No DOM here, so it runs under `node --test`.
// WhatsApp asks for 512x512 stickers with a 16 px margin, and at most 100 KB for a static one.

export const STICKER_SIZE = 512;
export const MARGIN = 16;
export const MAX_STATIC_BYTES = 100 * 1024;
export const MAX_OUTLINE = MARGIN - 2;
export const DEFAULT_OUTLINE_COLOR = "#ffffff";

/** The outline color as #rrggbb. Anything that isn't a hex color (like an empty input) gives white. */
export function outlineColor(value) {
  const v = String(value ?? "").trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(v)) return v;
  if (/^#[0-9a-f]{3}$/.test(v)) return "#" + [...v.slice(1)].map((c) => c + c).join("");
  return DEFAULT_OUTLINE_COLOR;
}

/** Where to draw a w x h image so it fits inside the margin, centered, keeping its aspect ratio. */
export function fitRect(w, h, size = STICKER_SIZE, margin = MARGIN) {
  if (!(w > 0 && h > 0)) throw new RangeError("the image has no size");
  const box = size - 2 * margin;
  const scale = Math.min(box / w, box / h);
  const dw = Math.max(1, Math.round(w * scale));
  const dh = Math.max(1, Math.round(h * scale));
  return { x: Math.round((size - dw) / 2), y: Math.round((size - dh) / 2), w: dw, h: dh };
}

/** Offsets for drawing the outline: `steps` points on a circle of radius r. */
export function outlineOffsets(r, steps = Math.max(16, Math.ceil(2 * Math.PI * r))) {
  // About one stamp per pixel of circumference, so thin strokes get no gaps in the outline.
  if (r <= 0) return [];
  const out = [];
  for (let i = 0; i < steps; i++) {
    const a = (2 * Math.PI * i) / steps;
    out.push([Math.round(Math.cos(a) * r * 100) / 100, Math.round(Math.sin(a) * r * 100) / 100]);
  }
  return out;
}

export const QUALITIES = [0.92, 0.85, 0.75, 0.65, 0.5, 0.35, 0.2];

/**
 * Calls encode(quality) from best to worst until the result fits in maxBytes.
 * encode returns a Blob-like object ({ size, type }) or null.
 * Result: { blob, quality, fits }, or null when the encoder gave nothing.
 * When the browser can't write WebP, canvas.toBlob silently returns PNG: `webp` is false then.
 */
export async function encodeUnderLimit(encode, maxBytes = MAX_STATIC_BYTES, qualities = QUALITIES) {
  let last = null;
  for (const q of qualities) {
    const blob = await encode(q);
    if (!blob) return null;
    const webp = blob.type === "image/webp";
    last = { blob, quality: q, fits: blob.size <= maxBytes, webp };
    if (!webp || last.fits) return last;
  }
  return last;
}
