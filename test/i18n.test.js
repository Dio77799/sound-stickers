import { test } from "node:test";
import assert from "node:assert/strict";
import { TEXT, pickLang } from "../src/i18n.js";

test("English and Spanish have the same keys, none empty", () => {
  assert.deepEqual(Object.keys(TEXT.es).sort(), Object.keys(TEXT.en).sort());
  for (const lang of ["en", "es"]) {
    for (const [key, value] of Object.entries(TEXT[lang])) assert.ok(value.trim(), `${lang}.${key} is empty`);
  }
});

test("a saved language wins, otherwise the browser language picks", () => {
  assert.equal(pickLang("es-MX", "en"), "en");
  assert.equal(pickLang("es-MX", null), "es");
  assert.equal(pickLang("fr", "xx"), "en");
});
