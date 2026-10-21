import type { Program } from './ast.js';
/**
 * How hard this file is checked.
 * `none` looks away. `lazy` checks a written type where it is written.
 * `basic` checks that type again when the name is used.
 * `strict` does what `basic` does, and it also checks `public`, `private`, and `protected`.
 * Untyped names stay free in every mode. `nil` still fits. Extra arguments are still ignored.
 */
export type TypeMode = 'none' | 'lazy' | 'basic' | 'strict';
/** `none`, `lazy`, `basic`, or `strict`. Anything else is null. */
export declare function parseTypeMode(value: string): TypeMode | null;
/** File annotation wins. `types` wins over `strict: true`. Otherwise strict means strict, and the default is none. */
export declare function fallbackTypeMode(options?: {
    types?: TypeMode;
    strict?: boolean;
}): TypeMode;
/**
 * The mode this file asked for.
 * `@none`, `@normal`, and `@off` are none. `@lazy`, `@basic`, and `@strict` name themselves.
 * A later one wins. `fallback` is the compiler option when the file says nothing.
 */
export declare function fileTypeMode(program: Program, fallback?: TypeMode): TypeMode;
/**
 * True when this file opted into strict mode.
 * `@strict` turns it on. `@normal` turns it off. A later one wins.
 * `fallback` is the compiler option when the file says nothing.
 */
export declare function fileIsStrict(program: Program, fallback?: boolean): boolean;
/** Walk a parsed program. `true` is strict. `false` is none. A mode name is that mode. */
export declare function checkProgram(program: Program, filename: string, strictOrMode?: boolean | TypeMode): void;
