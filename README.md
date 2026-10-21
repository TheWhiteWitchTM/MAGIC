# MAGIC

Alpha. This is early work, and it can still change. Mira, [The White Witch™](https://thewhitewitchtm.github.io/whitewitch/). [X](https://x.com/TheWhiteWitchTM) · [thewhitewitchtm@google.com](mailto:thewhitewitchtm@google.com) · [GitHub](https://github.com/TheWhiteWitchTM) · [YouTube](https://youtube.com/@TheWhiteWitchTM) · [Bluesky](https://bsky.app/profile/thewhitewitchtm.sociallydead.me) · [MIT License](LICENSE)

MAGIC mixes Lua and BASIC, and it compiles to JavaScript. A script can load a canvas, a terminal, 3D, a UI kit, sound, hex grids, and a few game helpers. `magic run` runs it. `magic app` writes an Electron project. `magic pack` writes that same project, and `magic pack --build` also builds the standalone app.

`@canvas` loads a module. `import` does the same job when you want to name what you take.

```
@canvas
@games

let engine = new Engine({ width: 480, height: 270 })
let spark = engine.sprite("✦", 240, 135, 42)

fn frame()
  if engine.isKeyDown("ArrowRight") then
    spark.x = spark.x + 4
  end
  engine.update()
  engine.canvas.draw()
  requestAnimationFrame(frame)
end

requestAnimationFrame(frame)
```

This file is the door. [LEARN.md](LEARN.md) is the short course. [LANGUAGE.md](LANGUAGE.md) is the language. [MODULES.md](MODULES.md) is each module. [lang/](lang/README.md) is the machine-readable definition.

## Install and run the demo

```bash
npm install
npm run demo
```

`npm install` compiles `src/` into `dist/` and writes the script-tag builds to `browser/`. `npm run build` does that again after you change the TypeScript. The demo runs a language check, a headless scene, the sound, hex, and games modules, a small desk, and an Electron folder. It prints `demo ok`.

## The site

```bash
npm run serve
```

Open the URL it prints, `http://127.0.0.1:8740/` unless the port is taken. The site is the course, the module list, a playground, and the examples. `magic serve --port 8740` is the same command.

## Commands

```bash
npm run magic -- run examples/scene.magic
npm run magic -- compile examples/check.magic -o game.js
npm run magic -- app examples/scene.magic -o build/drift --title "Drift"
npm run magic -- pack examples/scene.magic -o build/drift --title "Drift"
```

`node dist/cli.js` is the same program. A project that depends on this package gets a `magic` command.

`magic compile` writes one JavaScript module. Magic files that the script imports are copied into that module. A standard module stays a package import: `magic/canvas`, `magic/terminal`, `emoji-engine-3d`, `emoji-engine-ui`, `magic/sound`, `magic/hex`, or `magic/games`. `magic run --types lazy` checks a written type where it is written. `--types basic` checks it again when the name is used. `--types strict` and `--strict` also check `private`. `@none` looks away. A file annotation wins, and an untyped name stays free.

`magic app` and `magic pack` write a folder. The window is 960 by 720 unless `--width` and `--height` say otherwise. The folder's `package.json` depends on Electron and electron-builder. MAGIC does not install them unless you pass `--build` to `magic pack`.

```bash
cd build/drift
npm install
npm start
npm run pack
```

`npm start` opens the window. `npm run pack` writes a standalone app under `dist/`, a folder you can run without `npm start`. `npm run dist` writes installers. The window keeps `contextIsolation` on, `nodeIntegration` off, and `sandbox` on. [tools/electron.md](tools/electron.md) is the longer note.

`msx` runs a `.magic` file the way `tsx` runs TypeScript. `js2magic` turns JavaScript or TypeScript into a Magic draft. Both live in [tools/](tools/README.md).

## Modules

`@name` at the top of a file loads a module and binds its exports. `@name as local` binds the module under one name.

| Module | Loads |
| --- | --- |
| `@canvas` | `Canvas`, `Engine`, `Utilities` |
| `@terminal` | `Terminal`, `Utilities` |
| `@2d` | Both halves of the 2D engine |
| `@3d` | The 3D engine |
| `@ui` | Windows, buttons, menus |
| `@sound` | Tones and notes |
| `@hex` | Hex grids |
| `@games` | Loops, keys, scenes, scores |

Canvas and terminal are the two halves of what used to be one `2d` import. `@2d` still loads both when a script wants the whole set. `@canvas` and `@terminal` both export `Utilities`, so use `@terminal as term` when you load both.

`use "canvas"` is the same load as `@canvas`. `use "./words"` loads a `.magic` file you wrote: every top-level `fn`, `class`, and `let` is an export. `import Engine from "canvas"` picks names. The details are in [MODULES.md](MODULES.md).

## Language

[LANGUAGE.md](LANGUAGE.md) is every form and every rule. This is the shape.

Keywords ignore case. Names keep their case. A newline ends a statement. `end` closes `if`, `while`, `for`, `repeat`, `fn`, `class`, and `try`. A local lives in the block that created it and can be collected when that block ends. `then` and `do` are optional. `--` comments out the rest of the line. `nil`, `false`, `0`, and `""` are false. `=` assigns. `==` compares. Indexes start at 0. `for i = 1 to 3` visits 1, 2, and 3, and `i` does not exist after the loop. `$"Hello, {name}!"` fills text. `"""` spans lines.

```
fn greet(name)
  return "Hello, " .. name
end

class Counter
  n = 0
  fn new(start)
    self.n = start
  end
  fn bump()
    self.n = self.n + 1
    return self.n
  end
end

print greet("Ada")
print Counter(1).bump()
```

`@strict` asks for the types you wrote, and for `public`, `private`, and `protected` on a class. A script that writes neither is unchanged. Types use `as`, so `:` can still end a statement.

## Examples

| File | What it shows |
| --- | --- |
| `examples/hello.magic` | A function and `print` |
| `examples/check.magic` | The language check |
| `examples/scene.magic` | `@canvas`, a sprite, a collision |
| `examples/modules.magic` | `@hex`, `@games`, `@sound` |
| `examples/desk.magic` | A terminal and the UI kit |
| `examples/strict.magic` | Types and private fields |
| `examples/play.html` | Drift, in the browser |

## From JavaScript

```js
import { compile, Runtime, App } from 'magic';

const runtime = new Runtime();
await runtime.runFile('examples/scene.magic');

const packed = App.pack('examples/scene.magic', {
  out: 'build/drift',
  title: 'Drift',
});

const script = compile(source, { filename: 'play.magic', target: 'script' });
new Function(script.code)();
```

A page loads `browser/magic.js` and calls `Magic.compile`. That build is the compiler. `browser/magic-stdlib.js` is sound, hex, and games. The picture modules come from the engine browser builds.
