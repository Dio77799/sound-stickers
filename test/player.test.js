import { test } from "node:test";
import assert from "node:assert/strict";
import { createPlayer } from "../src/player.js";

// A stand-in for AudioContext that records what happened to each source.
function fakeAudio() {
  const contexts = [];
  const newContext = () => {
    const ctx = {
      closed: false,
      destination: {},
      sources: [],
      close() {
        this.closed = true;
      },
      createBufferSource() {
        const src = {
          started: null,
          stopped: false,
          onended: null,
          connect() {},
          start(when, offset, duration) {
            this.started = { when, offset, duration };
          },
          stop() {
            this.stopped = true;
          },
        };
        ctx.sources.push(src);
        return src;
      },
    };
    contexts.push(ctx);
    return ctx;
  };
  return { contexts, newContext };
}

test("playing the selection starts it at the start time for its length", () => {
  const { contexts, newContext } = fakeAudio();
  const player = createPlayer(newContext);
  player.play("buffer", 1.5, 4);
  assert.deepEqual(contexts[0].sources[0].started, { when: 0, offset: 1.5, duration: 2.5 });
  assert.equal(player.playing, true);
});

test("pressing the button again stops the sound instead of playing it twice", () => {
  const { contexts, newContext } = fakeAudio();
  const changes = [];
  const player = createPlayer(newContext, (p) => changes.push(p));
  // Same as the play button in app.js.
  const press = () => (player.playing ? player.stop() : player.play("buffer", 0, 3));
  press();
  press();
  assert.equal(contexts.length, 1);
  assert.equal(contexts[0].sources[0].stopped, true);
  assert.equal(contexts[0].closed, true);
  assert.equal(player.playing, false);
  assert.deepEqual(changes, [true, false]);
});

test("the end of an old sound doesn't stop the one playing now", () => {
  const { contexts, newContext } = fakeAudio();
  const player = createPlayer(newContext);
  player.play("buffer", 0, 3);
  const oldEnded = contexts[0].sources[0].onended;
  player.play("buffer", 1, 2);
  oldEnded();
  assert.equal(player.playing, true);
  assert.equal(contexts[1].closed, false);
});

test("a source that fails to start leaves the player idle and closes its context", () => {
  const { contexts, newContext } = fakeAudio();
  const changes = [];
  const player = createPlayer(() => {
    const ctx = newContext();
    const make = ctx.createBufferSource.bind(ctx);
    ctx.createBufferSource = () => Object.assign(make(), { start() { throw new RangeError("bad offset"); } });
    return ctx;
  }, (p) => changes.push(p));
  assert.throws(() => player.play("buffer", 0, 1), RangeError);
  assert.equal(player.playing, false);
  assert.equal(contexts[0].closed, true);
  assert.deepEqual(changes, []);
});

test("playing again stops the previous sound first, so they never overlap", () => {
  const { contexts, newContext } = fakeAudio();
  const player = createPlayer(newContext);
  player.play("buffer", 0, 3);
  player.play("buffer", 1, 2);
  assert.equal(contexts[0].sources[0].stopped, true);
  assert.equal(contexts[0].closed, true);
  assert.equal(contexts[1].closed, false);
});

test("when the sound ends by itself the player is idle and the context is closed", () => {
  const { contexts, newContext } = fakeAudio();
  const changes = [];
  const player = createPlayer(newContext, (p) => changes.push(p));
  player.play("buffer", 0, 1);
  contexts[0].sources[0].onended();
  assert.equal(player.playing, false);
  assert.equal(contexts[0].closed, true);
  assert.deepEqual(changes, [true, false]);
});

test("stopping when nothing plays does nothing", () => {
  const changes = [];
  const player = createPlayer(fakeAudio().newContext, (p) => changes.push(p));
  player.stop();
  assert.deepEqual(changes, []);
});
