import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TEXT } from "../src/i18n.js";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const keys = [...html.matchAll(/data-t(?:-label)?="([^"]+)"/g)].map((m) => m[1]);

test("every text the page uses exists in English and Spanish", () => {
  assert.ok(keys.includes("outlineColor"));
  for (const lang of ["en", "es"]) {
    for (const key of keys) assert.ok(TEXT[lang][key], `${lang} is missing "${key}"`);
  }
});

test("English and Spanish have the same keys", () => {
  assert.deepEqual(Object.keys(TEXT.es).sort(), Object.keys(TEXT.en).sort());
});
