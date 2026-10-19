import type { Program } from './ast.js';
export interface LoadedModule {
    absPath: string;
    source: string;
    program: Program;
}
/**
 * Read a script and the Magic files it imports.
 * The result is in dependency order: a file comes after the files it imports.
 */
export declare function loadGraph(entry: string, sources?: ReadonlyMap<string, string>): LoadedModule[];
/**
 * `use "./words"` brings in every top-level name that file exports.
 * Standard modules are already expanded. JavaScript files need `as`.
 */
export declare function expandUses(program: Program, fromFile: string, modules: ReadonlyMap<string, Program>): void;
export { resolveJsFile } from './jsmod.js';
/** `./witch` and `./witch.magic` both name a Magic file next to `fromFile`. */
export declare function resolveMagicFile(fromFile: string, specifier: string): string;
/** Deepest directory that contains every file. */
export declare function commonDir(files: string[]): string;
/** A flat file name that stays unique when several folders use the same name. */
export declare function moduleFile(root: string, absPath: string): string;
