/**
 * Tones and notes for a game.
 * In a browser this plays through the Web Audio API.
 * With no audio device the call still returns the event, so a script can be tested headless.
 */
const SHAPES = new Set(['sine', 'square', 'sawtooth', 'triangle']);
const SEMI = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
/** Frequency in hertz for a name such as `A4`, `C#5`, or `Bb3`. A4 is 440. */
export function freq(name) {
    const match = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(String(name).trim());
    if (!match)
        throw new Error(`note needs a name like C4 or A#3, not ${name}`);
    const letter = match[1] ?? 'a';
    const accidental = match[2] ?? '';
    const octave = Number(match[3]);
    const base = SEMI[letter.toLowerCase()] ?? 0;
    const semi = base + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0);
    const midi = (octave + 1) * 12 + semi;
    return 440 * 2 ** ((midi - 69) / 12);
}
export class Sound {
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
    tone(frequency, ms = 200, shape = 'sine') {
        const event = {
            kind: 'tone',
            note: null,
            frequency: Number(frequency),
            ms: Math.max(0, Number(ms) || 0),
            shape: SHAPES.has(shape) ? shape : 'sine',
        };
        if (!Number.isFinite(event.frequency))
            throw new Error('tone needs a frequency');
        this.events.push(event);
        this.playTone(event);
        return event;
    }
    /** Play a named note. `note("A4", 200)` is the A above middle C for a fifth of a second. */
    note(name, ms = 200, shape = 'sine') {
        const event = this.tone(freq(name), ms, shape);
        event.note = String(name).trim();
        return event;
    }
    /** A short burst of noise. */
    noise(ms = 200) {
        const event = { kind: 'noise', ms: Math.max(0, Number(ms) || 0) };
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
            const end = start + event.ms / 1000;
            gain.gain.setValueAtTime(Math.max(this.volume, 0.0001), start);
            gain.gain.exponentialRampToValueAtTime(0.0001, Math.max(end, start + 0.01));
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(end);
        }
        catch {
            // A missing device, or a browser that blocked autoplay, leaves the event recorded.
        }
    }
    playNoise(event) {
        const ctx = this.context();
        if (!ctx || this.muted || event.ms <= 0)
            return;
        try {
            const length = Math.max(1, Math.floor(ctx.sampleRate * (event.ms / 1000)));
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
            src.stop(ctx.currentTime + event.ms / 1000);
        }
        catch {
            // Same as a tone: the event is kept, the speaker stays quiet.
        }
    }
    context() {
        if (this.ctx)
            return this.ctx;
        const host = globalThis;
        const Ctor = host.AudioContext ?? host.webkitAudioContext;
        if (!Ctor)
            return null;
        try {
            this.ctx = new Ctor();
            return this.ctx;
        }
        catch {
            return null;
        }
    }
}
let shared = null;
function board() {
    if (!shared)
        shared = new Sound();
    return shared;
}
/** Play on the shared board. `tone(440, 200)` is A4 for a fifth of a second. */
export function tone(frequency, ms = 200, shape = 'sine') {
    return board().tone(frequency, ms, shape);
}
/** `note("C4")` on the shared board. */
export function note(name, ms = 200, shape = 'sine') {
    return board().note(name, ms, shape);
}
/** Noise on the shared board. */
export function noise(ms = 200) {
    return board().noise(ms);
}
/** A tune on the shared board. See `Sound.play`. */
export function play(spec, ms = 180) {
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
        const [name, len] = token.split('/');
        const duration = len !== undefined && len !== '' ? Number(len) : ms;
        const rest = name === 'rest' || name === '-' || name === '_';
        return { note: rest ? null : (name ?? ''), ms: Number.isFinite(duration) ? duration : ms, rest };
    });
}
//# sourceMappingURL=sound.js.map