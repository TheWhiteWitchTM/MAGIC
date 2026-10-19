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

interface AudioOsc {
  type: string;
  frequency: { value: number };
  connect(node: unknown): void;
  start(): void;
  stop(when?: number): void;
}

interface AudioGain {
  gain: {
    value: number;
    setValueAtTime(value: number, time: number): void;
    exponentialRampToValueAtTime(value: number, time: number): void;
  };
  connect(node: unknown): void;
}

interface AudioBuffer {
  getChannelData(channel: number): Float32Array;
}

interface AudioBufferSource {
  buffer: AudioBuffer | null;
  connect(node: unknown): void;
  start(): void;
  stop(when?: number): void;
}

interface AudioCtx {
  currentTime: number;
  destination: unknown;
  sampleRate: number;
  createOscillator(): AudioOsc;
  createGain(): AudioGain;
  createBuffer(channels: number, length: number, sampleRate: number): AudioBuffer;
  createBufferSource(): AudioBufferSource;
}

const SHAPES = new Set(['sine', 'square', 'sawtooth', 'triangle']);
const SEMI: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };

/** Frequency in hertz for a name such as `A4`, `C#5`, or `Bb3`. A4 is 440. */
export function freq(name: string): number {
  const match = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(String(name).trim());
  if (!match) throw new Error(`note needs a name like C4 or A#3, not ${name}`);
  const letter = match[1] ?? 'a';
  const accidental = match[2] ?? '';
  const octave = Number(match[3]);
  const base = SEMI[letter.toLowerCase()] ?? 0;
  const semi = base + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0);
  const midi = (octave + 1) * 12 + semi;
  return 440 * 2 ** ((midi - 69) / 12);
}

export class Sound {
  volume: number;
  muted = false;
  /** Every tone and noise this board was asked to play, including silent hosts. */
  readonly events: SoundEvent[] = [];
  private ctx: AudioCtx | null = null;

  constructor(options: SoundOptions = {}) {
    const volume = options.volume ?? 0.2;
    this.volume = clamp01(volume);
  }

  /** Play a frequency for `ms` milliseconds. `shape` is sine, square, sawtooth, or triangle. */
  tone(frequency: number, ms = 200, shape = 'sine'): ToneEvent {
    const event: ToneEvent = {
      kind: 'tone',
      note: null,
      frequency: Number(frequency),
      ms: Math.max(0, Number(ms) || 0),
      shape: SHAPES.has(shape) ? shape : 'sine',
    };
    if (!Number.isFinite(event.frequency)) throw new Error('tone needs a frequency');
    this.events.push(event);
    this.playTone(event);
    return event;
  }

  /** Play a named note. `note("A4", 200)` is the A above middle C for a fifth of a second. */
  note(name: string, ms = 200, shape = 'sine'): ToneEvent {
    const event = this.tone(freq(name), ms, shape);
    event.note = String(name).trim();
    return event;
  }

  /** A short burst of noise. */
  noise(ms = 200): NoiseEvent {
    const event: NoiseEvent = { kind: 'noise', ms: Math.max(0, Number(ms) || 0) };
    this.events.push(event);
    this.playNoise(event);
    return event;
  }

  /**
   * Play a tune and return when it has finished.
   * `play("C4 E4 G4")` uses equal lengths. `play("C4/120 E4/60")` sets each length in milliseconds.
   * `rest` or `-` is a silence: `play("C4 rest E4")`.
   */
  async play(spec: string, ms = 180): Promise<SoundEvent[]> {
    const steps = parseTune(spec, ms);
    const heard: SoundEvent[] = [];
    for (const step of steps) {
      if (!step.rest && step.note) heard.push(this.note(step.note, step.ms));
      await wait(step.ms);
    }
    return heard;
  }

  gain(volume: number): number {
    this.volume = clamp01(volume);
    return this.volume;
  }

  mute(on = true): boolean {
    this.muted = on;
    return this.muted;
  }

  private playTone(event: ToneEvent): void {
    const ctx = this.context();
    if (!ctx || this.muted) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = event.shape;
      osc.frequency.value = event.frequency;
      const start = ctx.currentTime;
      const end = start + event.ms / 1000;
      gain.gain.setValueAtTime(Math.max(this.volume, 0.0001), start);
      gain.gain.exponentialRampToValueAtTime(0.0001, Math.max(end, start + 0.01));
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(end);
    } catch {
      // A missing device, or a browser that blocked autoplay, leaves the event recorded.
    }
  }

  private playNoise(event: NoiseEvent): void {
    const ctx = this.context();
    if (!ctx || this.muted || event.ms <= 0) return;
    try {
      const length = Math.max(1, Math.floor(ctx.sampleRate * (event.ms / 1000)));
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      const gain = ctx.createGain();
      src.buffer = buffer;
      gain.gain.value = this.volume * 0.4;
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start();
      src.stop(ctx.currentTime + event.ms / 1000);
    } catch {
      // Same as a tone: the event is kept, the speaker stays quiet.
    }
  }

  private context(): AudioCtx | null {
    if (this.ctx) return this.ctx;
    const host = globalThis as {
      AudioContext?: new () => AudioCtx;
      webkitAudioContext?: new () => AudioCtx;
    };
    const Ctor = host.AudioContext ?? host.webkitAudioContext;
    if (!Ctor) return null;
    try {
      this.ctx = new Ctor();
      return this.ctx;
    } catch {
      return null;
    }
  }
}

let shared: Sound | null = null;

function board(): Sound {
  if (!shared) shared = new Sound();
  return shared;
}

/** Play on the shared board. `tone(440, 200)` is A4 for a fifth of a second. */
export function tone(frequency: number, ms = 200, shape = 'sine'): ToneEvent {
  return board().tone(frequency, ms, shape);
}

/** `note("C4")` on the shared board. */
export function note(name: string, ms = 200, shape = 'sine'): ToneEvent {
  return board().note(name, ms, shape);
}

/** Noise on the shared board. */
export function noise(ms = 200): NoiseEvent {
  return board().noise(ms);
}

/** A tune on the shared board. See `Sound.play`. */
export function play(spec: string, ms = 180): Promise<SoundEvent[]> {
  return board().play(spec, ms);
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, ms));
  });
}

interface TuneStep {
  note: string | null;
  ms: number;
  rest: boolean;
}

function parseTune(spec: string, ms: number): TuneStep[] {
  const tokens = String(spec).trim().split(/\s+/).filter((token) => token.length > 0);
  return tokens.map((token) => {
    const [name, len] = token.split('/');
    const duration = len !== undefined && len !== '' ? Number(len) : ms;
    const rest = name === 'rest' || name === '-' || name === '_';
    return { note: rest ? null : (name ?? ''), ms: Number.isFinite(duration) ? duration : ms, rest };
  });
}
