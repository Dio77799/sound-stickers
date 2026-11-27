import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fitRect, outlineOffsets, outlineColor, encodeUnderLimit, MARGIN, STICKER_SIZE, MAX_STATIC_BYTES, DEFAULT_OUTLINE_COLOR,
} from "../src/sticker.js";

test("a wide image fills the width inside the margin and is centered", () => {
  const r = fitRect(1000, 500);
  assert.equal(r.w, STICKER_SIZE - 2 * MARGIN);
  assert.equal(r.h, 240);
  assert.equal(r.x, MARGIN);
  assert.equal(r.y, (STICKER_SIZE - 240) / 2);
});

test("a tall image fills the height inside the margin", () => {
  const r = fitRect(300, 900);
  assert.equal(r.h, 480);
  assert.equal(r.y, MARGIN);
});

test("a tiny image is scaled up, not left tiny", () => {
  const r = fitRect(10, 10);
  assert.deepEqual(r, { x: MARGIN, y: MARGIN, w: 480, h: 480 });
});

test("an extreme aspect ratio never gives a zero size", () => {
  const r = fitRect(100000, 1);
  assert.ok(r.h >= 1);
});

test("an image with no size is refused", () => {
  assert.throws(() => fitRect(0, 10), RangeError);
  assert.throws(() => fitRect(NaN, 10), RangeError);
});

test("outline offsets lie on the circle and there are none for width 0", () => {
  assert.deepEqual(outlineOffsets(0), []);
  for (const [x, y] of outlineOffsets(8)) assert.ok(Math.abs(Math.hypot(x, y) - 8) < 0.02);
});

test("the outline color is the picked hex color, white by default", () => {
  assert.equal(DEFAULT_OUTLINE_COLOR, "#ffffff");
  assert.equal(outlineColor("#FF0080"), "#ff0080");
  assert.equal(outlineColor(" #00ff00 "), "#00ff00");
  assert.equal(outlineColor("#0a0"), "#00aa00");
  for (const bad of ["", undefined, null, "red", "#12345", "#ggg000", "ff0080"]) {
    assert.equal(outlineColor(bad), DEFAULT_OUTLINE_COLOR);
  }
});

const fake = (sizes, type = "image/webp") => {
  const calls = [];
  const encode = async (q) => {
    calls.push(q);
    return { size: sizes(q), type };
  };
  return { encode, calls };
};

test("encoding stops at the first quality that fits", async () => {
  const { encode, calls } = fake((q) => (q > 0.7 ? MAX_STATIC_BYTES + 1 : 50_000));
  const r = await encodeUnderLimit(encode);
  assert.equal(r.fits, true);
  assert.equal(r.quality, 0.65);
  assert.equal(calls.length, 4);
});

test("when nothing fits, the smallest try is returned and marked", async () => {
  const { encode } = fake(() => MAX_STATIC_BYTES * 3);
  const r = await encodeUnderLimit(encode);
  assert.equal(r.fits, false);
  assert.equal(r.quality, 0.2);
});

test("a browser that falls back to PNG is detected on the first try", async () => {
  const { encode, calls } = fake(() => 500_000, "image/png");
  const r = await encodeUnderLimit(encode);
  assert.equal(r.webp, false);
  assert.equal(calls.length, 1);
});

test("an encoder that gives nothing returns null", async () => {
  assert.equal(await encodeUnderLimit(async () => null), null);
});
