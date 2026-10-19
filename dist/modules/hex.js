/**
 * Axial hexes for board games.
 * `q` steps east, `r` steps southeast. `s` is derived, and `q + r + s` is 0.
 * Layout is pointy-top. Direction 0 is east, then counterclockwise.
 * The arithmetic is the cube system from Red Blob Games.
 */
const DIR_Q = [1, 1, 0, -1, -1, 0];
const DIR_R = [0, -1, -1, 0, 1, 1];
export class Hex {
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
}
/** The six neighbors of the origin, east first, then counterclockwise. */
export const DIRECTIONS = [0, 1, 2, 3, 4, 5].map((dir) => new Hex(DIR_Q[dir] ?? 0, DIR_R[dir] ?? 0));
/** `hex(1, -1)` is one step east of north. `Hex(1, -1)` is the same cell. */
export function hex(q, r) {
    return new Hex(q, r);
}
export function add(a, b) {
    const left = cube(a);
    const right = cube(b);
    return hex(left.q + right.q, left.r + right.r);
}
/** Neighbor `dir` of `h`. `dir` wraps, so 6 is the same as 0 and -1 is 5. */
export function neighbor(h, dir) {
    const cell = cube(h);
    const index = mod(Math.trunc(dir), 6);
    return hex(cell.q + (DIR_Q[index] ?? 0), cell.r + (DIR_R[index] ?? 0));
}
/** The six cells around `h`, east first. */
export function neighbors(h) {
    return [0, 1, 2, 3, 4, 5].map((dir) => neighbor(h, dir));
}
/** Steps between two cells. `distance(hex(0, 0), hex(2, -1))` is 2. */
export function distance(a, b) {
    const left = cube(a);
    const right = cube(b);
    return Math.max(Math.abs(left.q - right.q), Math.abs(left.r - right.r), Math.abs(left.s - right.s));
}
/** Cells at exactly `radius` steps. Radius 0 is just the center. Radius 1 is the six neighbors. */
export function ring(center, radius) {
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
/** The center, then each ring out to `radius`. Radius 1 has 7 cells. */
export function spiral(center, radius) {
    const steps = Math.max(0, Math.trunc(radius));
    const out = ring(center, 0);
    for (let n = 1; n <= steps; n += 1)
        out.push(...ring(center, n));
    return out;
}
/** Cells from `a` to `b`, both ends included. */
export function line(a, b) {
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
/**
 * Pixel center of a cell. `size` is the distance from the center to a corner.
 * Pointy top: +q is east, +r is southeast.
 */
export function toPixel(h, size) {
    const cell = cube(h);
    const scale = Number(size);
    return {
        x: scale * (Math.sqrt(3) * cell.q + (Math.sqrt(3) / 2) * cell.r),
        y: scale * (3 / 2) * cell.r,
    };
}
/** The cell whose center is nearest the pixel. */
export function fromPixel(x, y, size) {
    const scale = Number(size) || 1;
    const q = ((Math.sqrt(3) / 3) * x - (1 / 3) * y) / scale;
    const r = ((2 / 3) * y) / scale;
    return round(q, r);
}
/** Round fractional axial coordinates to the nearest cell. */
export function round(q, r) {
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
/** `"q,r"`, for a map key. */
export function key(h) {
    const cell = cube(h);
    return `${cell.q},${cell.r}`;
}
/** The cell named by `key`. */
export function parse(text) {
    const [q, r] = String(text).split(',');
    return hex(Number(q), Number(r));
}
/**
 * A disk of cells around the origin, stored by `key`.
 * `new Grid(1)` holds 7 cells. `get` of a cell outside the disk is null.
 */
export class Grid {
    radius;
    cells = new Map();
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
        return value === undefined ? null : value;
    }
    set(h, value) {
        this.cells.set(key(h), value);
        return value;
    }
    hexes() {
        return [...this.cells.keys()].map((id) => parse(id));
    }
}
function cube(h) {
    if (!h || typeof h.q !== 'number' || typeof h.r !== 'number' || !Number.isFinite(h.q) || !Number.isFinite(h.r)) {
        throw new Error('hex needs q and r');
    }
    return { q: h.q, r: h.r, s: -h.q - h.r };
}
function lerpCube(a, b, t) {
    // A tiny nudge keeps a point from sitting on a face, where rounding is a tie.
    const q = a.q + (b.q - a.q) * t + 1e-6;
    const r = a.r + (b.r - a.r) * t + 1e-6;
    return round(q, r);
}
function mod(n, length) {
    return ((n % length) + length) % length;
}
//# sourceMappingURL=hex.js.map