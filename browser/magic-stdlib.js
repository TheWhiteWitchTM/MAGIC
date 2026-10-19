"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // dist/modules/games.js
  var games_exports = {};
  __export(games_exports, {
    Clock: () => Clock,
    Keys: () => Keys,
    Loop: () => Loop,
    Score: () => Score,
    Stage: () => Stage,
    approach: () => approach,
    chance: () => chance,
    choice: () => choice,
    clamp: () => clamp,
    lerp: () => lerp,
    range: () => range,
    wrap: () => wrap
  });
  function clamp(n, lo, hi) {
    return Math.min(hi, Math.max(lo, n));
  }
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }
  function approach(current, target, step) {
    const delta = target - current;
    const pace = Math.abs(step);
    if (Math.abs(delta) <= pace)
      return target;
    return current + Math.sign(delta) * pace;
  }
  function choice(list) {
    if (!list || list.length === 0)
      return null;
    const index = Math.floor(Math.random() * list.length);
    return list[index] ?? null;
  }
  function chance(p) {
    return Math.random() < p;
  }
  function range(n, start = 0) {
    const count = Math.max(0, Math.trunc(n));
    const out = [];
    for (let i = 0; i < count; i += 1)
      out.push(start + i);
    return out;
  }
  function wrap(n, length) {
    if (!Number.isFinite(n) || !Number.isFinite(length) || length === 0)
      return 0;
    return (n % length + length) % length;
  }
  var Clock = class {
    t0 = Date.now();
    last = this.t0;
    marks = /* @__PURE__ */ new Map();
    now() {
      return Date.now() - this.t0;
    }
    /** Milliseconds since the previous lap. The first lap is the time since construction. */
    lap() {
      const t = Date.now();
      const delta = t - this.last;
      this.last = t;
      return delta;
    }
    /** True once each `ms` for this name, then false until the interval passes again. */
    every(name, ms) {
      const t = Date.now();
      const prev = this.marks.get(name) ?? 0;
      if (t - prev < ms)
        return false;
      this.marks.set(name, t);
      return true;
    }
  };
  var Keys = class {
    held = /* @__PURE__ */ new Set();
    edges = /* @__PURE__ */ new Set();
    ups = /* @__PURE__ */ new Set();
    constructor() {
      const win = globalThis.window;
      if (!win || typeof win.addEventListener !== "function")
        return;
      win.addEventListener("keydown", (event) => {
        const key2 = event.key;
        if (key2)
          this.press(key2);
      });
      win.addEventListener("keyup", (event) => {
        const key2 = event.key;
        if (key2)
          this.release(key2);
      });
    }
    press(key2) {
      if (!this.held.has(key2))
        this.edges.add(key2);
      this.held.add(key2);
    }
    release(key2) {
      if (this.held.has(key2))
        this.ups.add(key2);
      this.held.delete(key2);
    }
    down(key2) {
      return this.held.has(key2);
    }
    /** True if the key went down since the last `endFrame`. */
    pressed(key2) {
      return this.edges.has(key2);
    }
    released(key2) {
      return this.ups.has(key2);
    }
    endFrame() {
      this.edges.clear();
      this.ups.clear();
    }
  };
  var Stage = class {
    scene = null;
    go(scene) {
      if (this.scene && this.scene.leave)
        this.scene.leave();
      this.scene = scene;
      if (scene && scene.enter)
        scene.enter();
    }
    update(dt) {
      if (this.scene && this.scene.update)
        this.scene.update(dt);
    }
    draw() {
      if (this.scene && this.scene.draw)
        this.scene.draw();
    }
  };
  var Loop = class {
    running = false;
    id = 0;
    fn;
    constructor(fn) {
      this.fn = fn;
    }
    start() {
      if (this.running)
        return;
      this.running = true;
      let prev = Date.now();
      const host2 = globalThis;
      const tick = () => {
        if (!this.running)
          return;
        const now = Date.now();
        const dt = (now - prev) / 1e3;
        prev = now;
        this.fn(dt);
        if (!this.running)
          return;
        if (host2.requestAnimationFrame)
          this.id = host2.requestAnimationFrame(() => tick());
        else
          this.id = setTimeout(tick, 16);
      };
      if (host2.requestAnimationFrame)
        this.id = host2.requestAnimationFrame(() => tick());
      else
        this.id = setTimeout(tick, 16);
    }
    stop() {
      this.running = false;
      const host2 = globalThis;
      if (host2.cancelAnimationFrame)
        host2.cancelAnimationFrame(this.id);
      clearTimeout(this.id);
    }
    run(frames, ms = 16) {
      const count = Math.max(0, Math.trunc(frames));
      const dt = (Number(ms) || 0) / 1e3;
      for (let i = 0; i < count; i += 1)
        this.fn(dt);
    }
  };
  var Score = class {
    value;
    best;
    constructor(start = 0) {
      const n = Number(start);
      this.value = Number.isFinite(n) ? n : 0;
      this.best = this.value;
    }
    add(n) {
      const delta = Number(n);
      if (!Number.isFinite(delta))
        throw new Error("score needs a number");
      this.value += delta;
      if (this.value > this.best)
        this.best = this.value;
      return this.value;
    }
    reset() {
      this.value = 0;
      return this.value;
    }
  };

  // dist/modules/hex.js
  var hex_exports = {};
  __export(hex_exports, {
    DIRECTIONS: () => DIRECTIONS,
    Grid: () => Grid,
    Hex: () => Hex,
    add: () => add,
    distance: () => distance,
    fromPixel: () => fromPixel,
    hex: () => hex,
    key: () => key,
    line: () => line,
    neighbor: () => neighbor,
    neighbors: () => neighbors,
    parse: () => parse,
    ring: () => ring,
    round: () => round,
    spiral: () => spiral,
    toPixel: () => toPixel
  });
  var DIR_Q = [1, 1, 0, -1, -1, 0];
  var DIR_R = [0, -1, -1, 0, 1, 1];
  var Hex = class {
    q;
    r;
    s;
    constructor(q, r) {
      this.q = q;
      this.r = r;
      this.s = -q - r;
    }
    add(other) {
      return hex(this.q + other.q, this.r + other.r);
    }
    neighbor(dir) {
      return neighbor(this, dir);
    }
    distance(other) {
      return distance(this, other);
    }
  };
  var DIRECTIONS = [0, 1, 2, 3, 4, 5].map((dir) => new Hex(DIR_Q[dir] ?? 0, DIR_R[dir] ?? 0));
  function hex(q, r) {
    return new Hex(q, r);
  }
  function add(a, b) {
    const left = cube(a);
    const right = cube(b);
    return hex(left.q + right.q, left.r + right.r);
  }
  function neighbor(h, dir) {
    const cell = cube(h);
    const index = mod(Math.trunc(dir), 6);
    return hex(cell.q + (DIR_Q[index] ?? 0), cell.r + (DIR_R[index] ?? 0));
  }
  function neighbors(h) {
    return [0, 1, 2, 3, 4, 5].map((dir) => neighbor(h, dir));
  }
  function distance(a, b) {
    const left = cube(a);
    const right = cube(b);
    return Math.max(Math.abs(left.q - right.q), Math.abs(left.r - right.r), Math.abs(left.s - right.s));
  }
  function ring(center, radius) {
    const steps = Math.trunc(radius);
    const origin = cube(center);
    if (steps <= 0)
      return [hex(origin.q, origin.r)];
    const out = [];
    let cursor = hex(origin.q + (DIR_Q[4] ?? 0) * steps, origin.r + (DIR_R[4] ?? 0) * steps);
    for (let side = 0; side < 6; side += 1) {
      for (let step = 0; step < steps; step += 1) {
        out.push(cursor);
        cursor = neighbor(cursor, side);
      }
    }
    return out;
  }
  function spiral(center, radius) {
    const steps = Math.max(0, Math.trunc(radius));
    const out = ring(center, 0);
    for (let n = 1; n <= steps; n += 1)
      out.push(...ring(center, n));
    return out;
  }
  function line(a, b) {
    const left = cube(a);
    const right = cube(b);
    const n = distance(left, right);
    const out = [];
    for (let i = 0; i <= n; i += 1) {
      const t = n === 0 ? 0 : i / n;
      out.push(lerpCube(left, right, t));
    }
    return out;
  }
  function toPixel(h, size) {
    const cell = cube(h);
    const scale = Number(size);
    return {
      x: scale * (Math.sqrt(3) * cell.q + Math.sqrt(3) / 2 * cell.r),
      y: scale * (3 / 2) * cell.r
    };
  }
  function fromPixel(x, y, size) {
    const scale = Number(size) || 1;
    const q = (Math.sqrt(3) / 3 * x - 1 / 3 * y) / scale;
    const r = 2 / 3 * y / scale;
    return round(q, r);
  }
  function round(q, r) {
    const s = -q - r;
    let rq = Math.round(q);
    let rr = Math.round(r);
    let rs = Math.round(s);
    const dq = Math.abs(rq - q);
    const dr = Math.abs(rr - r);
    const ds = Math.abs(rs - s);
    if (dq > dr && dq > ds)
      rq = -rr - rs;
    else if (dr > ds)
      rr = -rq - rs;
    else
      rs = -rq - rr;
    return hex(rq, rr);
  }
  function key(h) {
    const cell = cube(h);
    return `${cell.q},${cell.r}`;
  }
  function parse(text) {
    const [q, r] = String(text).split(",");
    return hex(Number(q), Number(r));
  }
  var Grid = class {
    radius;
    cells = /* @__PURE__ */ new Map();
    constructor(radius = 1) {
      this.radius = Math.max(0, Math.trunc(radius));
      for (const cell of spiral(hex(0, 0), this.radius))
        this.cells.set(key(cell), null);
    }
    has(h) {
      return this.cells.has(key(h));
    }
    get(h) {
      const id = key(h);
      if (!this.cells.has(id))
        return null;
      const value = this.cells.get(id);
      return value === void 0 ? null : value;
    }
    set(h, value) {
      this.cells.set(key(h), value);
      return value;
    }
    hexes() {
      return [...this.cells.keys()].map((id) => parse(id));
    }
  };
  function cube(h) {
    if (!h || typeof h.q !== "number" || typeof h.r !== "number" || !Number.isFinite(h.q) || !Number.isFinite(h.r)) {
      throw new Error("hex needs q and r");
    }
    return { q: h.q, r: h.r, s: -h.q - h.r };
  }
  function lerpCube(a, b, t) {
    const q = a.q + (b.q - a.q) * t + 1e-6;
    const r = a.r + (b.r - a.r) * t + 1e-6;
    return round(q, r);
  }
  function mod(n, length) {
    return (n % length + length) % length;
  }

  // dist/modules/sound.js
  var sound_exports = {};
  __export(sound_exports, {
    Sound: () => Sound,
    freq: () => freq,
    noise: () => noise,
    note: () => note,
    play: () => play,
    tone: () => tone
  });
  var SHAPES = /* @__PURE__ */ new Set(["sine", "square", "sawtooth", "triangle"]);
  var SEMI = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  function freq(name) {
    const match = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(String(name).trim());
    if (!match)
      throw new Error(`note needs a name like C4 or A#3, not ${name}`);
    const letter = match[1] ?? "a";
    const accidental = match[2] ?? "";
    const octave = Number(match[3]);
    const base = SEMI[letter.toLowerCase()] ?? 0;
    const semi = base + (accidental === "#" ? 1 : accidental === "b" ? -1 : 0);
    const midi = (octave + 1) * 12 + semi;
    return 440 * 2 ** ((midi - 69) / 12);
  }
  var Sound = class {
    volume;
    muted = false;
    /** Every tone and noise this board was asked to play, including silent hosts. */
    events = [];
    ctx = null;
    constructor(options = {}) {
      const volume = options.volume ?? 0.2;
      this.volume = clamp01(volume);
    }
    /** Play a frequency for `ms` milliseconds. `shape` is sine, square, sawtooth, or triangle. */
    tone(frequency, ms = 200, shape = "sine") {
      const event = {
        kind: "tone",
        note: null,
        frequency: Number(frequency),
        ms: Math.max(0, Number(ms) || 0),
        shape: SHAPES.has(shape) ? shape : "sine"
      };
      if (!Number.isFinite(event.frequency))
        throw new Error("tone needs a frequency");
      this.events.push(event);
      this.playTone(event);
      return event;
    }
    /** Play a named note. `note("A4", 200)` is the A above middle C for a fifth of a second. */
    note(name, ms = 200, shape = "sine") {
      const event = this.tone(freq(name), ms, shape);
      event.note = String(name).trim();
      return event;
    }
    /** A short burst of noise. */
    noise(ms = 200) {
      const event = { kind: "noise", ms: Math.max(0, Number(ms) || 0) };
      this.events.push(event);
      this.playNoise(event);
      return event;
    }
    /**
     * Play a tune and return when it has finished.
     * `play("C4 E4 G4")` uses equal lengths. `play("C4/120 E4/60")` sets each length in milliseconds.
     * `rest` or `-` is a silence: `play("C4 rest E4")`.
     */
    async play(spec, ms = 180) {
      const steps = parseTune(spec, ms);
      const heard = [];
      for (const step of steps) {
        if (!step.rest && step.note)
          heard.push(this.note(step.note, step.ms));
        await wait(step.ms);
      }
      return heard;
    }
    gain(volume) {
      this.volume = clamp01(volume);
      return this.volume;
    }
    mute(on = true) {
      this.muted = on;
      return this.muted;
    }
    playTone(event) {
      const ctx = this.context();
      if (!ctx || this.muted)
        return;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = event.shape;
        osc.frequency.value = event.frequency;
        const start = ctx.currentTime;
        const end = start + event.ms / 1e3;
        gain.gain.setValueAtTime(Math.max(this.volume, 1e-4), start);
        gain.gain.exponentialRampToValueAtTime(1e-4, Math.max(end, start + 0.01));
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(end);
      } catch {
      }
    }
    playNoise(event) {
      const ctx = this.context();
      if (!ctx || this.muted || event.ms <= 0)
        return;
      try {
        const length = Math.max(1, Math.floor(ctx.sampleRate * (event.ms / 1e3)));
        const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i += 1)
          data[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource();
        const gain = ctx.createGain();
        src.buffer = buffer;
        gain.gain.value = this.volume * 0.4;
        src.connect(gain);
        gain.connect(ctx.destination);
        src.start();
        src.stop(ctx.currentTime + event.ms / 1e3);
      } catch {
      }
    }
    context() {
      if (this.ctx)
        return this.ctx;
      const host2 = globalThis;
      const Ctor = host2.AudioContext ?? host2.webkitAudioContext;
      if (!Ctor)
        return null;
      try {
        this.ctx = new Ctor();
        return this.ctx;
      } catch {
        return null;
      }
    }
  };
  var shared = null;
  function board() {
    if (!shared)
      shared = new Sound();
    return shared;
  }
  function tone(frequency, ms = 200, shape = "sine") {
    return board().tone(frequency, ms, shape);
  }
  function note(name, ms = 200, shape = "sine") {
    return board().note(name, ms, shape);
  }
  function noise(ms = 200) {
    return board().noise(ms);
  }
  function play(spec, ms = 180) {
    return board().play(spec, ms);
  }
  function clamp01(n) {
    if (!Number.isFinite(n))
      return 0;
    if (n < 0)
      return 0;
    if (n > 1)
      return 1;
    return n;
  }
  function wait(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, Math.max(0, ms));
    });
  }
  function parseTune(spec, ms) {
    const tokens = String(spec).trim().split(/\s+/).filter((token) => token.length > 0);
    return tokens.map((token) => {
      const [name, len] = token.split("/");
      const duration = len !== void 0 && len !== "" ? Number(len) : ms;
      const rest = name === "rest" || name === "-" || name === "_";
      return { note: rest ? null : name ?? "", ms: Number.isFinite(duration) ? duration : ms, rest };
    });
  }

  // dist/modules/browser-entry.js
  var host = globalThis;
  var modules = host.MagicModules ?? {};
  modules.sound = sound_exports;
  modules.hex = hex_exports;
  modules.games = games_exports;
  host.MagicModules = modules;
})();
