import { type ModuleName } from './modules.js';
export interface PackOptions {
    /** Folder to write. Default is `build/<name>` in the current directory. */
    out?: string;
    /** Package name. Default is the script's file name. */
    name?: string;
    /** Window title. Default is the package name. */
    title?: string;
    /** Window width in pixels. Default 960. */
    width?: number;
    /** Window height in pixels. Default 720. */
    height?: number;
    /**
     * After writing the project, run `npm install` and `npm run pack`.
     * That downloads Electron and writes a standalone app under `dist/`.
     */
    build?: boolean;
}
export interface PackResult {
    dir: string;
    modules: ModuleName[];
    /** Set when `--build` produced the electron-builder output folder. */
    standalone: string | null;
}
/**
 * Turns one Magic script into an Electron project.
 * It copies the browser builds the script actually imports.
 * It does not download Electron unless `build` is set.
 * `npm start` opens the window. `npm run pack` writes a standalone app. `npm run dist` writes installers.
 */
export declare class App {
    static pack(entry: string, options?: PackOptions): PackResult;
}
