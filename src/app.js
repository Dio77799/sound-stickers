import { STICKER_SIZE, MAX_OUTLINE, fitRect, outlineOffsets, encodeUnderLimit } from "./sticker.js";
import { MAX_SECONDS, clampTrim, clipToWav } from "./audio.js";
import { TEXT, pickLang } from "./i18n.js";

const $ = (id) => document.getElementById(id);
const state = { lang: "en", image: null, audio: null, recorder: null, urls: [], imageSeq: 0, audioSeq: 0 };
const t = (key) => TEXT[state.lang][key] ?? key;

// ---------- language ----------
function applyLang(lang) {
  state.lang = lang;
  document.documentElement.lang = lang;
  for (const el of document.querySelectorAll("[data-t]")) el.textContent = t(el.dataset.t);
  for (const el of document.querySelectorAll("[data-t-label]")) el.setAttribute("aria-label", t(el.dataset.tLabel));
  for (const b of document.querySelectorAll("[data-lang]")) b.setAttribute("aria-pressed", String(b.dataset.lang === lang));
  if (state.recorder) $("record").textContent = t("stop");
  try { localStorage.setItem("lang", lang); } catch { /* private mode */ }
}

// ---------- image ----------
function drawSticker(canvas) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, STICKER_SIZE, STICKER_SIZE);
  if (!state.image) return;
  const img = state.image;
  const r = fitRect(img.width, img.height);
  const width = $("outline").checked ? Math.min(MAX_OUTLINE, Number($("outlineWidth").value)) : 0;
  if (width > 0) {
    // Silhouette of the image in the outline color, stamped around a circle, then the image on top.
    const sil = document.createElement("canvas");
    sil.width = STICKER_SIZE;
    sil.height = STICKER_SIZE;
    const s = sil.getContext("2d");
    s.drawImage(img, r.x, r.y, r.w, r.h);
    s.globalCompositeOperation = "source-in";
    s.fillStyle = $("outlineColor").value;
    s.fillRect(0, 0, STICKER_SIZE, STICKER_SIZE);
    for (const [dx, dy] of outlineOffsets(width)) ctx.drawImage(sil, dx, dy);
  }
  ctx.drawImage(img, r.x, r.y, r.w, r.h);
}

async function loadImage(file) {
  // A slow, earlier pick must not overwrite a later one.
  const seq = ++state.imageSeq;
  let img = null;
  try {
    img = await createImageBitmap(file);
  } catch {
    if (seq === state.imageSeq) say(t("imageError"));
  }
  if (seq !== state.imageSeq) return;
  state.image = img;
  drawSticker($("preview"));
}

// ---------- audio ----------
async function loadAudio(blob) {
  const seq = ++state.audioSeq;
  const ctx = new AudioContext();
  try {
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
    if (seq !== state.audioSeq) return;
    state.audio = buf;
    $("start").value = "0";
    $("end").value = String(Math.min(buf.duration, MAX_SECONDS).toFixed(1));
    $("start").max = $("end").max = String(buf.duration.toFixed(1));
    $("duration").textContent = `(${buf.duration.toFixed(1)} s)`;
    $("play").disabled = false;
  } catch {
    if (seq !== state.audioSeq) return;
    state.audio = null;
    $("play").disabled = true;
    say(t("audioError"));
  } finally {
    ctx.close();
  }
}

function selection() {
  const a = state.audio;
  const r = clampTrim($("start").value, $("end").value, a.duration);
  $("start").value = r.start.toFixed(1);
  $("end").value = r.end.toFixed(1);
  return r;
}

function channels(buf) {
  return Array.from({ length: buf.numberOfChannels }, (_, i) => buf.getChannelData(i));
}

function play() {
  if (!state.audio) return;
  const { start, end } = selection();
  const ctx = new AudioContext();
  const src = ctx.createBufferSource();
  src.buffer = state.audio;
  src.connect(ctx.destination);
  src.onended = () => ctx.close();
  src.start(0, start, Math.max(0, end - start));
}

async function toggleRecord() {
  const btn = $("record");
  if (state.recorder) {
    state.recorder.stop();
    return;
  }
  // Disabled while the browser asks for the microphone, so a second click can't open a second recorder.
  btn.disabled = true;
  let stream;
  let rec;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    rec = new MediaRecorder(stream);
  } catch {
    stream?.getTracks().forEach((tr) => tr.stop());
    say(t("micError"));
    return;
  } finally {
    btn.disabled = false;
  }
  const chunks = [];
  state.recorder = rec;
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.onstop = async () => {
    clearTimeout(rec.limit);
    stream.getTracks().forEach((tr) => tr.stop());
    state.recorder = null;
    btn.classList.remove("recording");
    btn.textContent = t("record");
    await loadAudio(new Blob(chunks, { type: rec.mimeType }));
  };
  rec.start();
  rec.limit = setTimeout(() => rec.state === "recording" && rec.stop(), MAX_SECONDS * 1000);
  btn.classList.add("recording");
  btn.textContent = t("stop");
}

// ---------- output ----------
function say(msg) {
  $("message").textContent = msg;
}

function link(id, blob, name) {
  const url = URL.createObjectURL(blob);
  state.urls.push(url);
  const a = $(id);
  a.href = url;
  a.download = name;
  a.hidden = false;
  return url;
}

async function build() {
  const btn = $("build");
  if (btn.disabled) return;
  btn.disabled = true;
  try {
    await makeFiles();
  } finally {
    btn.disabled = false;
  }
}

async function makeFiles() {
  say("");
  // Old links point at revoked URLs: hide them until new ones exist.
  $("results").hidden = true;
  state.urls.forEach((u) => URL.revokeObjectURL(u));
  state.urls = [];
  if (!state.image) {
    say(t("needImage"));
    return;
  }

  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = STICKER_SIZE;
  drawSticker(canvas);
  const res = await encodeUnderLimit((q) => new Promise((ok) => canvas.toBlob(ok, "image/webp", q)));
  if (!res) {
    say(t("imageError"));
    return;
  }
  const notes = [];
  if (!res.webp) notes.push(t("noWebp"));
  else if (!res.fits) notes.push(t("tooBig"));
  const stickerName = res.webp ? "sticker.webp" : "sticker.png";
  link("dlSticker", res.blob, stickerName);
  $("dlSticker").lastChild.textContent = ` ${stickerName} (${Math.round(res.blob.size / 1024)} KB)`;
  const files = [new File([res.blob], stickerName, { type: res.blob.type })];

  $("dlSound").hidden = true;
  $("soundPreview").hidden = true;
  const sel = state.audio && selection();
  if (sel && sel.end - sel.start < 0.1) notes.push(t("emptySelection"));
  if (sel && sel.end - sel.start >= 0.1) {
    const { start, end } = sel;
    const wav = new Blob([clipToWav(channels(state.audio), state.audio.sampleRate, start, end)], { type: "audio/wav" });
    const url = link("dlSound", wav, "sound.wav");
    $("soundPreview").src = url;
    $("soundPreview").hidden = false;
    files.push(new File([wav], "sound.wav", { type: "audio/wav" }));
  }

  const share = $("share");
  share.hidden = !(navigator.canShare && navigator.canShare({ files }));
  $("shareNote").hidden = share.hidden;
  share.onclick = () => navigator.share({ files }).catch(() => {});
  $("results").hidden = false;
  say(notes.join(" "));
}

// ---------- wiring ----------
applyLang(pickLang(navigator.language, (() => { try { return localStorage.getItem("lang"); } catch { return null; } })()));
for (const b of document.querySelectorAll("[data-lang]")) b.addEventListener("click", () => applyLang(b.dataset.lang));
$("image").addEventListener("change", (e) => e.target.files[0] && loadImage(e.target.files[0]));
$("audio").addEventListener("change", (e) => e.target.files[0] && loadAudio(e.target.files[0]));
$("outline").addEventListener("change", () => drawSticker($("preview")));
$("outlineWidth").addEventListener("input", () => drawSticker($("preview")));
$("outlineColor").addEventListener("input", () => drawSticker($("preview")));
$("record").addEventListener("click", toggleRecord);
$("play").addEventListener("click", play);
$("build").addEventListener("click", build);
