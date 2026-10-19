# Architecture

MAGIC is the language. The picture, the terminal, 3D, and the UI kit are libraries it loads. Sound, hex, and games ship in this package.

The compiler is five pieces. Each one owns a single job. Application code is the only thing that may compose them.

```text
application
  ├─ App.pack(entry)     an Electron project, and optionally a standalone build
  ├─ startServer()       the language site
  └─ Runtime ── uses ──▶ Compiler ── uses ──▶ Parser ── uses ──▶ Lexer
```

| Piece | Owns | Leaves alone |
| --- | --- | --- |
| Lexer | Characters into tokens, including the newline | What a program means |
| Parser | Tokens into a tree, then `@canvas` into an import | JavaScript |
| Compiler | One Magic file into JavaScript | Reading a folder, opening a window |
| Runtime | Running that JavaScript on Node | Packing Electron |
| App | The Electron project on disk | Playing the game |

The words `print` and `len` live in `src/std.ts` as plain JavaScript text. The standard modules live in `src/modules/`. The registry in `src/modules.ts` is the list `@name` and `import "name"` both use. Nothing imports a module sideways except the compiler, the runtime, the bundler, and the packager.

Lexer, Parser, and Compiler do not import Runtime or App. The browser entry, `src/browser.ts`, exports the compiler and stops there, so a page can compile a script without a file system. The checker in `src/check.ts` is part of the compiler. It runs when a file is `@strict`.

`src/lower.ts` runs at the end of the parse. A module annotation becomes an import statement. After that, the compiler has one way to load a module.

## Modules

| Name | Implementation | Browser global |
| --- | --- | --- |
| `canvas` | re-export of `Canvas`, `Engine`, `Utilities` from emoji-engine-2d | `EmojiEngine` |
| `terminal` | re-export of `Terminal`, `Utilities` from emoji-engine-2d | `EmojiEngine` |
| `2d` | the emoji-engine-2d package | `EmojiEngine` |
| `3d` | the emoji-engine-3d package | `EmojiEngine3D` |
| `ui` | the emoji-engine-ui package | `EmojiEngineUI` |
| `sound`, `hex`, `games` | `src/modules/*.ts` | `MagicModules.sound`, `.hex`, `.games` |

A classic script reads those globals. `magic run` imports the built file by a `file:` URL, because Node will not resolve a package from a script written under the temp directory. Canvas and terminal then import `emoji-engine-2d` from this package, which Node can resolve.

## Lexer and parser

The lexer is the one described in the language: a newline is a token, keywords ignore case, names keep their case. `@2d` is a number and a name in the token stream. The annotation parser joins them when they spell a module.

`end` is the only closer. `then` and `do` may be left out.

## Compiler

The compiler walks the tree twice for locals, then once more for `@strict`. Every top-level `fn`, `class`, and `let` is exported. Imports are not exported again. An unknown name becomes `globalThis.name`.

A module import in an ES module uses the specifier from the registry (`magic/canvas`, `emoji-engine-3d`, and the rest). A classic script binds the same names from the browser global and throws `canvas is not loaded` when that global is missing.

## Runtime, bundle, app, site

`src/runtime.ts` loads the import graph and dynamic-imports the entry. `src/bundle.ts` inlines every Magic file into one script for `magic compile` and for `App.pack`. `src/app.ts` writes the Electron project and, with `build: true`, runs `npm install` and `npm run pack`. `src/serve.ts` serves `site/`, the docs, the examples, the browser builds, and the sibling engine scripts.

`src/cli.ts` is the `magic` command. `src/tools/msx.ts` and `src/tools/js2magic.ts` are the other two commands.

## Source map

```text
src/lexer.ts            tokens
src/parser.ts           the tree
src/lower.ts            @module into import
src/modules.ts          the module registry
src/modules/canvas.ts   picture re-exports
src/modules/terminal.ts text re-exports
src/modules/sound.ts    tones and notes
src/modules/hex.ts      hex grids
src/modules/games.ts    loops, keys, scenes, scores
src/compiler.ts         one file of JavaScript
src/check.ts            @strict
src/std.ts              prelude text
src/runtime.ts          run a graph on Node
src/bundle.ts           one file for a whole graph
src/app.ts              Electron project
src/serve.ts            the language site
src/cli.ts              the magic command
src/browser.ts          compiler exports for a page
lang/                   grammar, TextMate, the JSON definition
editors/vscode/         a small highlighting extension
site/                   the pages magic serve opens
examples/               programs and the demo
```

`package.json` is `"type": "module"`. `npm run build` compiles `src/` to `dist/`, then writes `browser/magic.js`, `browser/magic.min.js`, and `browser/magic-stdlib.js`. The page global is `Magic`, also stored as `MAGIC`.
