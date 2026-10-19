import { type BrowserAsset, type ModuleName } from './modules.js';
/** Directory of this package, whether the file running is `src` or `dist`. */
export declare function packageRoot(): string;
/**
 * Absolute path of a module's implementation.
 * Node cannot resolve a package from a script written under `/tmp`, so the
 * runtime imports this file by URL. A missing engine falls back to the sibling folder.
 */
export declare function moduleEntry(name: ModuleName): string;
/** `file:` URL of that module entry. */
export declare function moduleFileUrl(name: ModuleName): string;
/**
 * A script-tag build: an engine's `browser/` file, or MAGIC's own `magic-stdlib.js`.
 */
export declare function browserAssetFile(asset: BrowserAsset): string;
/** Sibling engine browser file, used by `magic serve`. */
export declare function siblingBrowser(packageName: string, file: string): string | null;
