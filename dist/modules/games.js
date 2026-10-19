/**
 * Small pieces a game keeps rewriting: bounds, a clock, keys, a loop, scenes, a score.
 * They stay out of the picture modules so a terminal game and a canvas game can share them.
 */
/** `clamp(9, 0, 4)` is 4. */
export function clamp(n, lo, hi) {
    return Math.min(hi, Math.max(lo, n));
}
/** `lerp(0, 10, 0.5)` is 5. `t` is not clamped. */
export function lerp(a, b, t) {
    return a + (b - a) * t;
}
/** Move `current` toward `target` by at most `step`. `approach(1, 9, 3)` is 4. */
export function approach(current, target, step) {
    const delta = target - current;
    const pace = Math.abs(step);
    if (Math.abs(delta) <= pace)
        return target;
    return current + Math.sign(delta) * pace;
}
/** One item of a list, or null when the list is empty. */
export function choice(list) {
    if (!list || list.length === 0)
        return null;
    const index = Math.floor(Math.random() * list.length);
    return list[index] ?? null;
}
/** True with probability `p`. `chance(0)` is false. `chance(1)` is true. */
export function chance(p) {
    return Math.random() < p;
}
/** `range(4)` is `[0, 1, 2, 3]`. `range(3, 1)` is `[1, 2, 3]`. */
export function range(n, start = 0) {
    const count = Math.max(0, Math.trunc(n));
    const out = [];
    for (let i = 0; i < count; i += 1)
        out.push(start + i);
    return out;
}
/** Wrap into `0 .. length-1`. `wrap(-1, 4)` is 3. */
export function wrap(n, length) {
    if (!Number.isFinite(n) || !Number.isFinite(length) || length === 0)
        return 0;
    return ((n % length) + length) % length;
}
/** Milliseconds since this clock was made, a lap, and a named interval. */
export class Clock {
    t0 = Date.now();
    last = this.t0;
    marks = new Map();
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
}
/**
 * Keys that are down, and keys that went down or up since `endFrame`.
 * In a browser it listens on `window`. A headless script can call `press` and `release`.
 */
export class Keys {
    held = new Set();
    edges = new Set();
    ups = new Set();
    constructor() {
        const win = globalThis.window;
        if (!win || typeof win.addEventListener !== 'function')
            return;
        win.addEventListener('keydown', (event) => {
            const key = event.key;
            if (key)
                this.press(key);
        });
        win.addEventListener('keyup', (event) => {
            const key = event.key;
            if (key)
                this.release(key);
        });
    }
    press(key) {
        if (!this.held.has(key))
            this.edges.add(key);
        this.held.add(key);
    }
    release(key) {
        if (this.held.has(key))
            this.ups.add(key);
        this.held.delete(key);
    }
    down(key) {
        return this.held.has(key);
    }
    /** True if the key went down since the last `endFrame`. */
    pressed(key) {
        return this.edges.has(key);
    }
    released(key) {
        return this.ups.has(key);
    }
    endFrame() {
        this.edges.clear();
        this.ups.clear();
    }
}
/** One scene at a time. `go` calls `leave` on the old scene and `enter` on the new one. */
export class Stage {
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
}
/**
 * Calls `fn(dt)` with `dt` in seconds.
 * `start` uses `requestAnimationFrame` when the host has it, otherwise a 16ms timer.
 * `run(frames, ms)` steps without a timer, which is what a headless check wants.
 */
export class Loop {
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
        const host = globalThis;
        const tick = () => {
            if (!this.running)
                return;
            const now = Date.now();
            const dt = (now - prev) / 1000;
            prev = now;
            this.fn(dt);
            if (!this.running)
                return;
            if (host.requestAnimationFrame)
                this.id = host.requestAnimationFrame(() => tick());
            else
                this.id = setTimeout(tick, 16);
        };
        if (host.requestAnimationFrame)
            this.id = host.requestAnimationFrame(() => tick());
        else
            this.id = setTimeout(tick, 16);
    }
    stop() {
        this.running = false;
        const host = globalThis;
        if (host.cancelAnimationFrame)
            host.cancelAnimationFrame(this.id);
        clearTimeout(this.id);
    }
    run(frames, ms = 16) {
        const count = Math.max(0, Math.trunc(frames));
        const dt = (Number(ms) || 0) / 1000;
        for (let i = 0; i < count; i += 1)
            this.fn(dt);
    }
}
/** A number, and the highest value it has reached. */
export class Score {
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
            throw new Error('score needs a number');
        this.value += delta;
        if (this.value > this.best)
            this.best = this.value;
        return this.value;
    }
    reset() {
        this.value = 0;
        return this.value;
    }
}
//# sourceMappingURL=games.js.map