/**
 * Axial hexes for board games.
 * `q` steps east, `r` steps southeast. `s` is derived, and `q + r + s` is 0.
 * Layout is pointy-top. Direction 0 is east, then counterclockwise.
 * The arithmetic is the cube system from Red Blob Games.
 */
export interface Axial {
    q: number;
    r: number;
}
export interface Pixel {
    x: number;
    y: number;
}
export declare class Hex {
    readonly q: number;
    readonly r: number;
    readonly s: number;
    constructor(q: number, r: number);
    add(other: Axial): Hex;
    neighbor(dir: number): Hex;
    distance(other: Axial): number;
}
/** The six neighbors of the origin, east first, then counterclockwise. */
export declare const DIRECTIONS: Hex[];
/** `hex(1, -1)` is one step east of north. `Hex(1, -1)` is the same cell. */
export declare function hex(q: number, r: number): Hex;
export declare function add(a: Axial, b: Axial): Hex;
/** Neighbor `dir` of `h`. `dir` wraps, so 6 is the same as 0 and -1 is 5. */
export declare function neighbor(h: Axial, dir: number): Hex;
/** The six cells around `h`, east first. */
export declare function neighbors(h: Axial): Hex[];
/** Steps between two cells. `distance(hex(0, 0), hex(2, -1))` is 2. */
export declare function distance(a: Axial, b: Axial): number;
/** Cells at exactly `radius` steps. Radius 0 is just the center. Radius 1 is the six neighbors. */
export declare function ring(center: Axial, radius: number): Hex[];
/** The center, then each ring out to `radius`. Radius 1 has 7 cells. */
export declare function spiral(center: Axial, radius: number): Hex[];
/** Cells from `a` to `b`, both ends included. */
export declare function line(a: Axial, b: Axial): Hex[];
/**
 * Pixel center of a cell. `size` is the distance from the center to a corner.
 * Pointy top: +q is east, +r is southeast.
 */
export declare function toPixel(h: Axial, size: number): Pixel;
/** The cell whose center is nearest the pixel. */
export declare function fromPixel(x: number, y: number, size: number): Hex;
/** Round fractional axial coordinates to the nearest cell. */
export declare function round(q: number, r: number): Hex;
/** `"q,r"`, for a map key. */
export declare function key(h: Axial): string;
/** The cell named by `key`. */
export declare function parse(text: string): Hex;
/**
 * A disk of cells around the origin, stored by `key`.
 * `new Grid(1)` holds 7 cells. `get` of a cell outside the disk is null.
 */
export declare class Grid {
    readonly radius: number;
    private readonly cells;
    constructor(radius?: number);
    has(h: Axial): boolean;
    get(h: Axial): unknown;
    set(h: Axial, value: unknown): unknown;
    hexes(): Hex[];
}
