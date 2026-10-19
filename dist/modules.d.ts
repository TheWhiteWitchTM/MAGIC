/**
 * Modules a Magic script can load with `@name` or `import ... from "name"`.
 * Canvas and terminal are the two halves of emoji-engine-2d.
 * 3d and ui are the other engines. Sound, hex, and games ship with MAGIC.
 */
export type ModuleName = 'canvas' | 'terminal' | '2d' | '3d' | 'ui' | 'sound' | 'hex' | 'games';
export interface BrowserAsset {
    id: string;
    /** File name copied into an Electron app. */
    file: string;
    /** `self` is this package's `browser/` folder. Anything else is a sibling package. */
    package: string;
    /** Global the browser build assigns, when it assigns one. */
    global: string | null;
}
export interface ModuleInfo {
    name: ModuleName;
    /** One line for docs and errors. */
    summary: string;
    /** Specifier written into a compiled ES module. */
    specifier: string;
    /** Where `magic run` loads the implementation. */
    source: {
        kind: 'file';
        file: string;
    } | {
        kind: 'package';
        package: string;
    };
    /** Names `@name` brings into the file. */
    exports: string[];
    /** Browser build to copy when a script uses this module. */
    asset: string | null;
    /**
     * Expression that reads the module namespace in a classic script.
     * Parentheses stay in the expression when it is not a bare property.
     */
    script: string;
}
export declare const BROWSER_ASSETS: BrowserAsset[];
export declare const MODULES: Record<ModuleName, ModuleInfo>;
/** Short name or package name, or null when the specifier is not a Magic module. */
export declare function moduleKey(specifier: string): ModuleName | null;
export declare function moduleBySpecifier(specifier: string): ModuleInfo | null;
export declare function moduleOrder(): ModuleName[];
export declare function moduleNs(name: string): string;
export declare function assetsFor(names: readonly ModuleName[]): BrowserAsset[];
export declare function assetById(id: string): BrowserAsset | null;
/** `canvas has no Terminal. Terminal is exported by terminal, 2d, 3d.` */
export declare function missingExport(moduleName: string, imported: string): string;
/**
 * A Magic script import, as opposed to a module or a plain JavaScript file.
 * `./witch` counts. `./notes.js` does not.
 */
export declare function isMagicSpecifier(specifier: string): boolean;
/** A JavaScript or JSON module. Package names are included when they end in those extensions. */
export declare function isJsSpecifier(specifier: string): boolean;
/**
 * A JS or JSON file next to the importer.
 * `./math.js` counts. `lodash` does not. `pkg/index.js` is left to the package resolver.
 */
export declare function isRelativeJsSpecifier(specifier: string): boolean;
