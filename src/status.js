// The status line under the build button. No DOM here, so it runs under `node --test`.
// It keeps text keys, not text, so a message can follow a language switch and be cleared
// once the problem it reports is gone.

/** render(text) shows the line; translate(key) gives the text for a key in the current language. */
export function createStatus(render, translate) {
  let keys = [];
  const show = () => render(keys.map(translate).join(" "));
  return {
    /** Replaces the line with these messages (none clears it). */
    say(...next) {
      keys = next;
      show();
    },
    /** Clears the line if it is showing any of these messages, leaving others alone. */
    clear(...fixed) {
      if (keys.some((k) => fixed.includes(k))) this.say();
    },
    /** Draws the same messages again, after the language changed. */
    refresh: show,
  };
}
