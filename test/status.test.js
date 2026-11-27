import { test } from "node:test";
import assert from "node:assert/strict";
import { createStatus } from "../src/status.js";

const TEXT = {
  en: { imageError: "Couldn't read that image.", noWebp: "No WebP.", tooBig: "Too big." },
  es: { imageError: "No se pudo leer esa imagen.", noWebp: "Sin WebP.", tooBig: "Muy grande." },
};

function setup() {
  let lang = "en";
  const shown = [];
  const status = createStatus((text) => shown.push(text), (k) => TEXT[lang][k]);
  return { status, shown, setLang: (l) => (lang = l) };
}

test("several messages are shown on one line", () => {
  const { status, shown } = setup();
  status.say("noWebp", "tooBig");
  assert.equal(shown.at(-1), "No WebP. Too big.");
});

test("a message follows a language switch", () => {
  const { status, shown, setLang } = setup();
  status.say("imageError");
  setLang("es");
  status.refresh();
  assert.equal(shown.at(-1), "No se pudo leer esa imagen.");
});

test("an error goes away once the thing it was about works", () => {
  const { status, shown } = setup();
  status.say("imageError");
  status.clear("imageError");
  assert.equal(shown.at(-1), "");
});

test("clearing one problem leaves an unrelated message alone", () => {
  const { status, shown } = setup();
  status.say("noWebp");
  const before = shown.length;
  status.clear("imageError");
  assert.equal(shown.length, before);
  assert.equal(shown.at(-1), "No WebP.");
});
