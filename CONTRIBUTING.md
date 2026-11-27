# Contributing

Thanks for helping. A few rules keep the project small and easy to review:

1. **No dependencies and no build step.** Plain HTML, CSS and ES modules. If something truly needs a library,
   open an issue first.
2. **Nothing leaves the device.** No analytics, no remote fonts, no uploads. The Content Security Policy in
   `index.html` blocks network requests; keep it that way.
3. **Logic goes in modules without the DOM** (`src/sticker.js`, `src/audio.js`) so it can be tested with
   `npm test`. Every fix comes with a test that fails without it.
4. **Text goes in `src/i18n.js`**, in English and Spanish.
5. Small pull requests, one change each.

## Ideas to start with

* Animated stickers: GIF or video to animated WebP under 500 KB.
* Export a sticker pack file for sticker apps.
* OGG Opus output, so the sound arrives as a voice note.
