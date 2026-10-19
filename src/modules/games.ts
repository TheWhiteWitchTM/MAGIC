/**
 * Small pieces a game keeps rewriting: bounds, a clock, keys, a loop, scenes, a score.
 * They stay out of the picture modules so a terminal game and a canvas game can share them.
 */

/** `clamp(9, 0, 4)` is 4. */
export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** `lerp(0, 10, 0.5)` is 5. `t` is not clamped. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Move `current` toward `target` by at most `step`. `approach(1, 9, 3)` is 4. */
export function approach(current: number, target: number, step: number): number {
  const delta = target - current;
  const pace = Math.abs(step);
  if (Math.abs(delta) <= pace) return target;
  return current + Math.sign(delta) * pace;
}

/** One item of a list, or null when the list is empty. */
export function choice<T>(list: readonly T[] | null | undefined): T | null {
  if (!list || list.length === 0) return null;
  const index = Math.floor(Math.random() * list.length);
  return list[index] ?? null;
}

/** True with probability `p`. `chance(0)` is false. `chance(1)` is true. */
export function chance(p: number): boolean {
  return Math.random() < p;
}

/** `range(4)` is `[0, 1, 2, 3]`. `range(3, 1)` is `[1, 2, 3]`. */
export function range(n: number, start = 0): number[] {
  const count = Math.max(0, Math.trunc(n));
  const out: number[] = [];
  for (let i = 0; i < count; i += 1) out.push(start + i);
  return out;
}

/** Wrap into `0 .. length-1`. `wrap(-1, 4)` is 3. */
export function wrap(n: number, length: number): number {
  if (!Number.isFinite(n) || !Number.isFinite(length) || length === 0) return 0;
  return ((n % length) + length) % length;
}

/** Milliseconds since this clock was made, a lap, and a named interval. */
export class Clock {
  private readonly t0 = Date.now();
  private last = this.t0;
  private readonly marks = new Map<string, number>();

  now(): number {
    return Date.now() - this.t0;
  }

  /** Milliseconds since the previous lap. The first lap is the time since construction. */
  lap(): number {
    const t = Date.now();
    const delta = t - this.last;
    this.last = t;
    return delta;
  }

  /** True once each `ms` for this name, then false until the interval passes again. */
  every(name: string, ms: number): boolean {
    const t = Date.now();
    const prev = this.marks.get(name) ?? 0;
    if (t - prev < ms) return false;
    this.marks.set(name, t);
    return true;
  }
}

/**
 * Keys that are down, and keys that went down or up since `endFrame`.
 * In a browser it listens on `window`. A headless script can call `press` and `release`.
 */
export class Keys {
  private readonly held = new Set<string>();
  private readonly edges = new Set<string>();
  private readonly ups = new Set<string>();

  constructor() {
    const win = (globalThis as { window?: { addEventListener?: (type: string, handler: (event: { key?: string }) => void) => void } }).window;
    if (!win || typeof win.addEventListener !== 'function') return;
    win.addEventListener('keydown', (event) => {
      const key = (event as { key?: string }).key;
      if (key) this.press(key);
    });
    win.addEventListener('keyup', (event) => {
      const key = (event as { key?: string }).key;
      if (key) this.release(key);
    });
  }

  press(key: string): void {
    if (!this.held.has(key)) this.edges.add(key);
    this.held.add(key);
  }

  release(key: string): void {
    if (this.held.has(key)) this.ups.add(key);
    this.held.delete(key);
  }

  down(key: string): boolean {
    return this.held.has(key);
  }

  /** True if the key went down since the last `endFrame`. */
  pressed(key: string): boolean {
    return this.edges.has(key);
  }

  released(key: string): boolean {
    return this.ups.has(key);
  }

  endFrame(): void {
    this.edges.clear();
    this.ups.clear();
  }
}

export interface Scene {
  enter?: () => void;
  update?: (dt: number) => void;
  draw?: () => void;
  leave?: () => void;
}

/** One scene at a time. `go` calls `leave` on the old scene and `enter` on the new one. */
export class Stage {
  scene: Scene | null = null;

  go(scene: Scene | null): void {
    if (this.scene && this.scene.leave) this.scene.leave();
    this.scene = scene;
    if (scene && scene.enter) scene.enter();
  }

  update(dt: number): void {
    if (this.scene && this.scene.update) this.scene.update(dt);
  }

  draw(): void {
    if (this.scene && this.scene.draw) this.scene.draw();
  }
}

/**
 * Calls `fn(dt)` with `dt` in seconds.
 * `start` uses `requestAnimationFrame` when the host has it, otherwise a 16ms timer.
 * `run(frames, ms)` steps without a timer, which is what a headless check wants.
 */
export class Loop {
  private running = false;
  private id = 0;
  private readonly fn: (dt: number) => void;

  constructor(fn: (dt: number) => void) {
    this.fn = fn;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    let prev = Date.now();
    const host = globalThis as {
      requestAnimationFrame?: (cb: (t: number) => void) => number;
    };
    const tick = (): void => {
      if (!this.running) return;
      const now = Date.now();
      const dt = (now - prev) / 1000;
      prev = now;
      this.fn(dt);
      if (!this.running) return;
      if (host.requestAnimationFrame) this.id = host.requestAnimationFrame(() => tick());
      else this.id = setTimeout(tick, 16) as unknown as number;
    };
    if (host.requestAnimationFrame) this.id = host.requestAnimationFrame(() => tick());
    else this.id = setTimeout(tick, 16) as unknown as number;
  }

  stop(): void {
    this.running = false;
    const host = globalThis as { cancelAnimationFrame?: (id: number) => void };
    if (host.cancelAnimationFrame) host.cancelAnimationFrame(this.id);
    clearTimeout(this.id);
  }

  run(frames: number, ms = 16): void {
    const count = Math.max(0, Math.trunc(frames));
    const dt = (Number(ms) || 0) / 1000;
    for (let i = 0; i < count; i += 1) this.fn(dt);
  }
}

/** A number, and the highest value it has reached. */
export class Score {
  value: number;
  best: number;

  constructor(start = 0) {
    const n = Number(start);
    this.value = Number.isFinite(n) ? n : 0;
    this.best = this.value;
  }

  add(n: number): number {
    const delta = Number(n);
    if (!Number.isFinite(delta)) throw new Error('score needs a number');
    this.value += delta;
    if (this.value > this.best) this.best = this.value;
    return this.value;
  }

  reset(): number {
    this.value = 0;
    return this.value;
  }
}
