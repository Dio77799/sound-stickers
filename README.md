# Sound Stickers

Make a WhatsApp ready sticker and the short sound that goes with it, right in the browser.
Nothing is uploaded: the image and the audio never leave your device.

**Try it:** https://dio77799.github.io/sound-stickers/

[Español abajo](#español)

## What it does

1. **Sticker:** takes any image, fits it in 512 x 512 with the 16 px margin WhatsApp asks for, adds an optional
   white outline (drawn inside that margin), and saves it as WebP under 100 KB (it lowers the quality step by step until it fits).
2. **Sound:** takes an audio or video file, or records from the microphone, lets you pick up to 10 seconds, and
   saves a mono WAV with a short fade so the cut doesn't click.
3. **Share:** on phones that support it, shares both files at once; otherwise you download them. A shared image
   arrives as a picture, so use WhatsApp's Create sticker to turn it into a sticker.

## Why two files

WhatsApp doesn't have stickers with a built in sound yet. It was reported testing them in beta in October 2026
([WABetaInfo](https://wabetainfo.com/whatsapp-is-testing-a-new-sound-sticker-format-on-android/),
[Android Authority](https://androidauthority.com/whatsapp-sound-stickers-apk-teardown-3724247)), with up to
10 seconds of audio for an image sticker. Until that ships, the way people do it is to send the sticker and the
sound right after it. This app makes both parts and keeps the sound within that 10 second limit.

## How to send it

1. In WhatsApp on iPhone or WhatsApp Web: open the sticker icon, choose **Create sticker** and pick the sticker file.
2. Send the sticker, then send `sound.wav` right after it.

## Run it locally

It's plain HTML and JavaScript with no dependencies and no build step. ES modules need a local server:

```sh
python -m http.server 8000
# open http://localhost:8000
```

Tests (Node 22 or newer):

```sh
npm test
```

## Layout

| File | What it does |
|---|---|
| `src/sticker.js` | Sticker geometry, outline offsets and the "fit under 100 KB" encoder loop |
| `src/audio.js` | Trim, mono mix, resample, fade and WAV encoding |
| `src/player.js` | Plays the sound selection, one at a time, and stops it on a second press |
| `src/app.js` | The page: file inputs, recording, preview, download and share |
| `src/i18n.js` | English and Spanish text |

`sticker.js`, `audio.js` and `player.js` don't touch the DOM, so the tests run them in Node.

## Known limits

* Static stickers only for now. Animated stickers (GIF or video to animated WebP) are the next step.
* Browsers that can't write WebP from a canvas (some Safari versions) give a PNG instead; the app says so.
* The sound is WAV. WhatsApp plays it as an audio file, not as a voice note.

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT

---

## Español

Crea un sticker listo para WhatsApp y el sonido corto que lo acompaña, desde el navegador. No se sube nada: la
imagen y el audio no salen de tu dispositivo.

* **Sticker:** ajusta cualquier imagen a 512 x 512 con el margen de 16 px que pide WhatsApp, con borde blanco
  opcional, y la guarda en WebP de menos de 100 KB.
* **Sonido:** de un audio, un video o el micrófono, eliges hasta 10 segundos y se guarda en WAV.
* **Enviar:** en WhatsApp (iPhone o WhatsApp Web) usas **Crear sticker** con el archivo del sticker, lo envías y justo
  después envías `sound.wav`.

En octubre de 2026 se reportó que WhatsApp prueba stickers con sonido incluido, con hasta 10 segundos de audio.
Mientras llega, esta app arma las dos partes y deja el sonido dentro de ese límite.
