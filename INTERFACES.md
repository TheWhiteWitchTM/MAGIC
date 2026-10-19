# Public interfaces

`src/index.ts` exports these. `npm run build` writes `dist/index.js` and `dist/index.d.ts`. A page loads `browser/magic.js` and gets `compile`, `Compiler`, `Lexer`, `Parser`, and `MagicError` on `Magic` and on `MAGIC`.

[LANGUAGE.md](LANGUAGE.md) is the language. The notes here are the contract the compiler implements.

## Language

A script is UTF-8 text in a `.magic` file. Keywords ignore case. Identifiers keep their case. `end` closes every block. `@name` is an annotation. These module annotations load a standard module at the top of the file:

`canvas`, `terminal`, `2d`, `3d`, `ui`, `sound`, `hex`, `games`.

`@canvas` imports every export of that module. `@sound as audio` imports the namespace. `use "canvas"` is that same import. `use "./words"` brings in the top-level exports of a Magic file when `magic run` or `magic compile` can read it. `use "./helpers.js" as helpers` is the namespace form for JavaScript. A module annotation inside a function throws `a module annotation belongs at the top of the script`. `use` in the same place throws `use belongs at the top of the script`. `@canvas()` throws `a module annotation does not take arguments`. Two modules that export the same name throw `comes from both`. A named import of a missing export throws `canvas has no Terminal`, and names the modules that do export it.

A local belongs to the block that created it: each `if` arm, `else`, loop body, `try`, `catch`, `finally`, function, and the top of the file. The binding ends with the block unless a nested function escaped with it. A `for` counter and a `catch` name do not survive the block. Templates are `$"..."`, `$'...'`, and `$"""..."""`, compiled through `__magic_fill`. `"""` is a multiline string. Constant folding runs at emit. A dead `if` arm is still typechecked.

`@strict` and `@normal` are unchanged. `@2d` and `@3d` are module names. The lexer splits the digit from the letter, and the parser joins them back.

`2d` and `emoji-engine-2d` are the whole 2D package. `canvas` and `terminal` are its two halves. `3d` and `emoji-engine-3d` are one package. `ui` and `emoji-engine-ui` are one package.

## Compile

```ts
interface CompileOptions {
  filename?: string;
  target?: 'module' | 'script';
  resolve?: (specifier: string) => string;
  prelude?: string;
  strict?: boolean;
}

interface CompiledImport {
  specifier: string;
  resolved: string;
  kind: 'module' | 'magic' | 'js';
  module: 'canvas' | 'terminal' | '2d' | '3d' | 'ui' | 'sound' | 'hex' | 'games' | null;
  form: 'side' | 'namespace' | 'named';
  alias: string | null;
  names: { imported: string; local: string }[];
}

interface CompileResult {
  code: string;
  exports: string[];
  imports: CompiledImport[];
  strict: boolean;
}

function compile(source: string, options?: CompileOptions): CompileResult;
```

`target` defaults to `'module'`. `'script'` wraps one classic script. A script that imports another Magic file throws `this script imports another Magic file`. A script that imports a JavaScript file throws `this script imports a JavaScript file`. A script import that is not a standard module throws `is not a Magic module`.

`resolve` rewrites import specifiers. The default uses each module's package specifier and turns `.magic` into `.js`.

A classic script reads `globalThis.EmojiEngine` for canvas, terminal, and `2d`, `EmojiEngine3D` for `3d`, `EmojiEngineUI` for `ui`, and `globalThis.MagicModules.sound` (and `.hex`, `.games`) for the modules that ship here. A missing global throws `canvas is not loaded`, using that module's name, when the script starts.

## Bundle

```ts
interface BundleResult {
  code: string;
  exports: string[];
  modules: Array<'canvas' | 'terminal' | '2d' | '3d' | 'ui' | 'sound' | 'hex' | 'games'>;
  files: string[];
}

function bundle(entry: string, options?: { target?: 'module' | 'script'; strict?: boolean }): BundleResult;
```

`modules` is the standard modules the graph imports, in the order canvas, terminal, 2d, 3d, ui, sound, hex, games. `files` is the Magic files, dependencies first.

`target: 'module'` imports each module by its package specifier. `target: 'script'` reads the browser globals. An external package that is not a standard module throws `is not a Magic file, a JS file, or a Magic module`.

## Runtime

```ts
class Runtime {
  constructor(options?: { root?: string; outDir?: string; strict?: boolean });
  runFile(file: string): Promise<Record<string, unknown>>;
  run(source: string, filename?: string): Promise<Record<string, unknown>>;
}
```

Each run writes a fresh directory and imports it. Standard modules are loaded by `file:` URL from this package, or from the sibling engine when the module is `2d`, `3d`, or `ui`. A missing engine throws `cannot find emoji-engine-2d. Install it next to MAGIC.`

## App

```ts
interface PackOptions {
  out?: string;
  name?: string;
  title?: string;
  width?: number;
  height?: number;
  build?: boolean;
}

interface PackResult {
  dir: string;
  modules: Array<'canvas' | 'terminal' | '2d' | '3d' | 'ui' | 'sound' | 'hex' | 'games'>;
  standalone: string | null;
}

class App {
  static pack(entry: string, options?: PackOptions): PackResult;
}
```

`pack` writes an Electron project and returns when the files are on disk. `build: true` then runs `npm install` and `npm run pack`, and `standalone` is the `dist` folder electron-builder wrote. Without `build`, `standalone` is null.

`width` defaults to 960 and `height` to 720. `out` defaults to `build/<name>`. The project scripts are `start` (`electron .`), `pack` (`electron-builder --dir`), and `dist` (`electron-builder`). A missing browser build names the file and the package to build.

## Serve

```ts
interface RunningServer {
  port: number;
  url: string;
  close(): Promise<void>;
}

function startServer(options?: { port?: number; host?: string; root?: string }): Promise<RunningServer>;
```

`port` defaults to 8740. `0` picks a free port. `host` defaults to `127.0.0.1`. The server reads `site/` for the pages, the package root for docs and examples, and the sibling `emoji-engine-2d`, `emoji-engine-3d`, and `emoji-engine-ui` browser folders for `/emoji-engine-2d/browser/...` and its two siblings.

## Errors

```ts
class MagicError extends Error {
  readonly line: number;
  readonly column: number;
  readonly filename: string;
  format(): string;
}
```

`format()` returns `file:line:column message`. The `magic` command prints that and exits 1.

## Modules for JavaScript

`magic/canvas`, `magic/terminal`, `magic/sound`, `magic/hex`, and `magic/games` are package exports. They are the same objects a Magic script receives. `MODULES` on the main export is the registry: name, summary, specifier, and exports.
