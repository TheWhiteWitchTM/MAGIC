import type { TypeMode } from './check.js';
export interface RuntimeOptions {
    /** Directory relative script names start from. Default is the current directory. */
    root?: string;
    /** Where generated modules are written. Default is a fresh folder under the system temp directory. */
    outDir?: string;
    /**
     * Fallback type mode when a file does not name one.
     * `@none`, `@lazy`, `@basic`, and `@strict` on the file win. `@normal` is `@none`.
     * When this is set, `strict` is ignored.
     */
    types?: TypeMode;
    /** Check every file as `@strict` unless that file writes another mode. Ignored when `types` is set. */
    strict?: boolean;
}
/** The exports of the script that just ran. */
export type MagicModule = Record<string, unknown>;
/**
 * Runs Magic on Node.
 * Each run writes a new folder of ES modules and imports the entry.
 * A new folder matters: Node caches a module by its URL.
 */
export declare class Runtime {
    readonly root: string;
    readonly outDir: string;
    /** True when the fallback mode is strict. A file annotation can still choose another mode. */
    readonly strict: boolean;
    /** Fallback mode for a file that does not name one. */
    readonly types: TypeMode;
    constructor(options?: RuntimeOptions);
    /** Read `file` and the Magic files it imports, then run the entry. */
    runFile(file: string): Promise<MagicModule>;
    /**
     * Run source that may not be on disk.
     * `filename` is the name errors use, and the folder imports are resolved from.
     */
    run(source: string, filename?: string): Promise<MagicModule>;
    private execute;
    private resolve;
    /** Real ESM is imported in place. JSON and classic scripts become a sibling module. */
    private jsSpecifier;
    private loadHook;
}
