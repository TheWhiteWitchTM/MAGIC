export interface ServeOptions {
    /** Default 8740. `0` asks the system for a free port. */
    port?: number;
    host?: string;
    root?: string;
}
export interface RunningServer {
    port: number;
    url: string;
    close(): Promise<void>;
}
/**
 * Serve the language site, the examples, the browser builds, and the sibling engines.
 * Engine scripts are read from the packages next to this one, so a page can load them.
 */
export declare function startServer(options?: ServeOptions): Promise<RunningServer>;
