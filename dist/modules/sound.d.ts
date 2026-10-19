/**
 * Tones and notes for a game.
 * In a browser this plays through the Web Audio API.
 * With no audio device the call still returns the event, so a script can be tested headless.
 */
export interface ToneEvent {
    kind: 'tone';
    note: string | null;
    frequency: number;
    ms: number;
    shape: string;
}
export interface NoiseEvent {
    kind: 'noise';
    ms: number;
}
export type SoundEvent = ToneEvent | NoiseEvent;
export interface SoundOptions {
    /** Gain from 0 to 1. Default 0.2. */
    volume?: number;
}
/** Frequency in hertz for a name such as `A4`, `C#5`, or `Bb3`. A4 is 440. */
export declare function freq(name: string): number;
export declare class Sound {
    volume: number;
    muted: boolean;
    /** Every tone and noise this board was asked to play, including silent hosts. */
    readonly events: SoundEvent[];
    private ctx;
    constructor(options?: SoundOptions);
    /** Play a frequency for `ms` milliseconds. `shape` is sine, square, sawtooth, or triangle. */
    tone(frequency: number, ms?: number, shape?: string): ToneEvent;
    /** Play a named note. `note("A4", 200)` is the A above middle C for a fifth of a second. */
    note(name: string, ms?: number, shape?: string): ToneEvent;
    /** A short burst of noise. */
    noise(ms?: number): NoiseEvent;
    /**
     * Play a tune and return when it has finished.
     * `play("C4 E4 G4")` uses equal lengths. `play("C4/120 E4/60")` sets each length in milliseconds.
     * `rest` or `-` is a silence: `play("C4 rest E4")`.
     */
    play(spec: string, ms?: number): Promise<SoundEvent[]>;
    gain(volume: number): number;
    mute(on?: boolean): boolean;
    private playTone;
    private playNoise;
    private context;
}
/** Play on the shared board. `tone(440, 200)` is A4 for a fifth of a second. */
export declare function tone(frequency: number, ms?: number, shape?: string): ToneEvent;
/** `note("C4")` on the shared board. */
export declare function note(name: string, ms?: number, shape?: string): ToneEvent;
/** Noise on the shared board. */
export declare function noise(ms?: number): NoiseEvent;
/** A tune on the shared board. See `Sound.play`. */
export declare function play(spec: string, ms?: number): Promise<SoundEvent[]>;
