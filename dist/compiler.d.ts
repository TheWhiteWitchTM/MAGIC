import type { ImportStmt, Program } from './ast.js';
import { type ModuleName } from './modules.js';
export interface CompileOptions {
    /** Shown in errors and in the comment at the top of the JavaScript. */
    filename?: string;
    /**
     * `module` writes an ES module that imports Magic modules.
     * `script` writes one IIFE that reads the module globals. It cannot import other Magic files.
     */
    target?: 'module' | 'script';
    /** Rewrites an import specifier. The default keeps module specifiers and turns `.magic` into `.js`. */
    resolve?: (specifier: string) => string;
    /** Prelude import path for `module`. Default `./magic-std.js`. */
    prelude?: string;
    /**
     * Check this file as `@strict` unless the file writes `@normal`.
     * Default is normal, matching a file with no annotation.
     */
    strict?: boolean;
}
export interface CompiledImport {
    specifier: string;
    resolved: string;
    kind: 'module' | 'magic' | 'js';
    module: ModuleName | null;
    form: ImportStmt['form'];
    alias: string | null;
    names: {
        imported: string;
        local: string;
    }[];
}
export interface CompileResult {
    code: string;
    exports: string[];
    imports: CompiledImport[];
    /** True when this file was checked in strict mode. */
    strict: boolean;
}
export interface BodyBinding {
    local: string;
    expr: string;
}
export interface BodyOptions {
    filename?: string;
    /** Import locals already available, as JavaScript expressions. */
    bindings: BodyBinding[];
    /** Same meaning as `CompileOptions.strict`. */
    strict?: boolean;
}
export interface BodyResult {
    code: string;
    exports: string[];
}
/**
 * Compiles one Magic script to JavaScript.
 * Application code can call `compile`. A bundle calls `emitBody` once per file.
 */
export declare class Compiler {
    private w;
    private filename;
    private esm;
    private bindings;
    private scope;
    private readonly scopes;
    private readonly root;
    private selfExpr;
    private superName;
    private allowSuper;
    private loop;
    private fnDepth;
    private canAwait;
    private temps;
    private readonly readyClasses;
    private defaultStrict;
    private guards;
    compile(source: string, options?: CompileOptions): CompileResult;
    compileProgram(program: Program, options?: CompileOptions): CompileResult;
    /** True when the file awaits at the top level, so a script wrapper has to be async. */
    hasTopLevelAwait(program: Program): boolean;
    /** Statements for one file inside a bundle. The caller wraps them in a function. */
    emitBody(program: Program, options: BodyOptions): BodyResult;
    private compileModule;
    private compileScript;
    private header;
    private emitModuleImports;
    private scriptBindings;
    private checkBindings;
    private emitMain;
    private emitHoist;
    private exportNames;
    private programKey;
    private emitStmt;
    private emitTry;
    private emitIf;
    /** A constant-true arm, or an else, is the last piece and has a null test. */
    private emitIfChain;
    private emitWhile;
    private emitRepeat;
    private emitFor;
    /** Locals of this block are declared here, not on the function, so they die with the block. */
    private emitScopeBody;
    private emitBraced;
    private emitAssign;
    private emitFn;
    private emitClass;
    private emitInit;
    private emitMethod;
    private emitFnBody;
    private emitAnon;
    private expr;
    private binary;
    private superCall;
    private prop;
    private callee;
    private ref;
    private assignable;
    private selfRef;
    private analyze;
    private analyzeBody;
    private scanSurface;
    private scanStmt;
    private scanAssign;
    private scanNested;
    private nestStmt;
    private analyzeFunction;
    private nestExpr;
    private declare;
    private lookup;
    private lookupFrom;
    private child;
    private blockScope;
    private needScope;
    private saveFlags;
    private restoreFlags;
    private hasTopAwait;
    private stmtHasTopAwait;
    private exprHasTopAwait;
    private temp;
    private reset;
    private checkModuleExports;
    private runCheck;
    private isStrict;
    private oops;
}
/** Compile one Magic script. */
export declare function compile(source: string, options?: CompileOptions): CompileResult;
export declare function defaultResolve(specifier: string): string;
