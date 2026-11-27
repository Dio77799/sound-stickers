// Plays one selection at a time. No DOM here, so it runs under `node --test`:
// the caller passes a function that makes an AudioContext (or anything shaped like one).

/**
 * newContext() -> { createBufferSource(), destination, close() }
 * onChange(playing) is called whenever playback starts or stops.
 */
export function createPlayer(newContext, onChange = () => {}) {
  let current = null;

  function finish(item) {
    if (current !== item) return;
    current = null;
    Promise.resolve(item.ctx.close()).catch(() => {});
    onChange(false);
  }

  function stop() {
    const item = current;
    if (!item) return;
    item.src.onended = null;
    try {
      item.src.stop();
    } catch {
      // Already stopped on its own.
    }
    finish(item);
  }

  function play(buffer, start, end) {
    stop();
    const ctx = newContext();
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    try {
      src.start(0, start, Math.max(0, end - start));
    } catch (err) {
      Promise.resolve(ctx.close()).catch(() => {});
      throw err;
    }
    // Only a source that really started becomes the current one.
    const item = { ctx, src };
    current = item;
    src.onended = () => finish(item);
    onChange(true);
  }

  return {
    play,
    stop,
    get playing() {
      return current !== null;
    },
  };
}
