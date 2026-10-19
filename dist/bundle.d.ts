import { type ModuleName } from './modules.js';
import { commonDir, moduleFile } from './graph.js';
export interface BundleOptions {
    /**
     * `module` is one ES module that imports Magic modules by package name.
     * `script` is one classic script that reads the module globals.
     */
    target?: 'module' | 'script';
    /** Check every file as `@strict` unless that file writes `@normal`. */
    strict?: boolean;
}
export interface BundleResult {
    code: string;
    /** Names the entry script declares. */
    exports: string[];
    /** Modules the script graph imports, in a stable order. */
    modules: ModuleName[];
    /** Absolute paths of the Magic files, entry last. */
    files: string[];
}
/**
 * Compile a Magic file and every Magic file it imports into one JavaScript file.
 * Module imports stay as package imports or as the browser globals.
 * Relative `.js` / `.json` files are imported or inlined.
 */
export declare function bundle(entry: string, options?: BundleOptions): BundleResult;
export { commonDir, moduleFile };
