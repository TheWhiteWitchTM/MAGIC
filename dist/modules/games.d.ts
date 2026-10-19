/**
 * Small pieces a game keeps rewriting: bounds, a clock, keys, a loop, scenes, a score.
 * They stay out of the picture modules so a terminal game and a canvas game can share them.
 */
/** `clamp(9, 0, 4)` is 4. */
export declare function clamp(n: number, lo: number, hi: number): number;
/** `lerp(0, 10, 0.5)` is 5. `t` is not clamped. */
export declare function lerp(a: number, b: number, t: number): number;
/** Move `current` toward `target` by at most `step`. `approach(1, 9, 3)` is 4. */
export declare function approach(current: number, target: number, step: number): number;
/** One item of a list, or null when the list is empty. */
export declare function choice<T>(list: readonly T[] | null | undefined): T | null;
/** True with probability `p`. `chance(0)` is false. `chance(1)` is true. */
export declare function chance(p: number): boolean;
/** `range(4)` is `[0, 1, 2, 3]`. `range(3, 1)` is `[1, 2, 3]`. */
export declare function range(n: number, start?: number): number[];
/** Wrap into `0 .. length-1`. `wrap(-1, 4)` is 3. */
export declare function wrap(n: number, length: number): number;
/** Milliseconds since this clock was made, a lap, and a named interval. */
export declare class Clock {
    private readonly t0;
    private last;
    private readonly marks;
    now(): number;
    /** Milliseconds since the previous lap. The first lap is the time since construction. */
    lap(): number;
    /** True once each `ms` for this name, then false until the interval passes again. */
    every(name: string, ms: number): boolean;
}
/**
 * Keys that are down, and keys that went down or up since `endFrame`.
 * In a browser it listens on `window`. A headless script can call `press` and `release`.
 */
export declare class Keys {
    private readonly held;
    private readonly edges;
    private readonly ups;
    constructor();
    press(key: string): void;
    release(key: string): void;
    down(key: string): boolean;
    /** True if the key went down since the last `endFrame`. */
    pressed(key: string): boolean;
    released(key: string): boolean;
    endFrame(): void;
}
export interface Scene {
    enter?: () => void;
    update?: (dt: number) => void;
    draw?: () => void;
    leave?: () => void;
}
/** One scene at a time. `go` calls `leave` on the old scene and `enter` on the new one. */
export declare class Stage {
    scene: Scene | null;
    go(scene: Scene | null): void;
    update(dt: number): void;
    draw(): void;
}
/**
 * Calls `fn(dt)` with `dt` in seconds.
 * `start` uses `requestAnimationFrame` when the host has it, otherwise a 16ms timer.
 * `run(frames, ms)` steps without a timer, which is what a headless check wants.
 */
export declare class Loop {
    private running;
    private id;
    private readonly fn;
    constructor(fn: (dt: number) => void);
    start(): void;
    stop(): void;
    run(frames: number, ms?: number): void;
}
/** A number, and the highest value it has reached. */
export declare class Score {
    value: number;
    best: number;
    constructor(start?: number);
    add(n: number): number;
    reset(): number;
}
