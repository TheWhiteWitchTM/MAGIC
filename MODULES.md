# Modules

Alpha. This is early work, and it can still change. Mira, [The White Witch™](https://thewhitewitchtm.github.io/whitewitch/). [X](https://x.com/TheWhiteWitchTM) · [thewhitewitchtm@google.com](mailto:thewhitewitchtm@google.com) · [GitHub](https://github.com/TheWhiteWitchTM) · [YouTube](https://youtube.com/@TheWhiteWitchTM) · [Bluesky](https://bsky.app/profile/thewhitewitchtm.sociallydead.me) · [MIT License](LICENSE)

A module annotation loads one of these for the whole file. `use "canvas"` is the same load. `use "./words"` loads a file you wrote. `import` loads the same module and lets you pick the names. The export lists here match [lang/magic.language.json](lang/magic.language.json) and the compiler.

A `.magic` file is a module. Top-level `fn`, `class`, and `let` are the exports. No export line is required.

```
use "./words"
print greet("Ada")
```

Canvas and terminal used to be one import called `2d`. They are two modules now. `@2d` still means both, when a script wants the whole emoji-engine-2d package.

`@canvas` and `@terminal` both export `Utilities`. So do `@2d` and `@3d`. Load the second one with `as`:

```
@canvas
@terminal as term
```

## canvas

`Canvas`, `Engine`, `Utilities`.

`Engine` is the sprite layer. It builds a `Canvas` unless you pass one. `sprite` places an emoji. `motion` sets a velocity in pixels per frame. `update` moves sprites and reports circle collisions. `canvas.draw` paints. `Utilities.wrap` adds a title bar and a footer around the picture.

```
@canvas

let engine = new Engine({ width: 480, height: 270 })
let ui = Utilities.wrap(engine.canvas, { title: "Drift" })
document.body.appendChild(ui.wrap)

let spark = engine.sprite("✦", 240, 135, 42)
engine.motion(spark, 2, 0)

fn frame()
  engine.update()
  engine.canvas.draw()
  requestAnimationFrame(frame)
end

requestAnimationFrame(frame)
```

`examples/scene.magic` runs the collision headless. `examples/play.html` is the same idea with the keyboard.

## terminal

`Terminal`, `Utilities`.

`Terminal` is a grid of cells. `write` understands newlines and the usual terminal controls. `put` and `set` edit one place. `get` reads a cell. A terminal can use its own canvas, or share one with an `Engine`.

```
@terminal as term

let screen = new term.Terminal({ cols: 40, rows: 12, showCursor: false })
screen.write("Hello\n")
print screen.get(0, 0).ch
```

`examples/desk.magic` paints a UI kit onto a terminal.

## 2d

`Canvas`, `Terminal`, `Engine`, `Utilities`.

This is emoji-engine-2d as one module. Use it when a file really does want both halves under the same names. Prefer `@canvas` and `@terminal` in new scripts.

`import Engine from "2d"` and `import Engine from "emoji-engine-2d"` are this module.

## 3d

`Canvas`, `Terminal`, `Engine`, `Utilities` from emoji-engine-3d.

The names match the 2D engine, so load it under a name when the file also uses canvas:

```
@3d as world
print type(world.Engine)
```

Constructing a 3D engine needs WebGL. Importing the class does not.

## ui

`Application`, `messageBox`, `confirm`, `MenuBar`, `StatusLine`, `borland`, `copyTheme`, `linux`, `theme`, `Desktop`, `Group`, `View`, `Button`, `CheckBox`, `InputLine`, `Label`, `ListBox`, `ProgressBar`, `RadioGroup`, `ScrollBar`, `StaticText`, `Dialog`, `Window`.

These are widgets on a terminal surface. `@ui as kit` is the comfortable form, because the list is long.

```
@terminal
@ui

let term = new Terminal({ cols: 40, rows: 12, showCursor: false })
let app = new Application(term, { sound: false })
let win = new Window({ title: "Hello", x: 4, y: 1, w: 22, h: 8 })
win.add(new Label({ text: "MAGIC", x: 2, y: 2 }))
win.add(new Button({ text: "Ok", x: 2, y: 4 }))
app.desktop.add(win)
app.draw()
```

## sound

`Sound`, `tone`, `note`, `noise`, `play`, `freq`.

`note("A4", 200)` plays the A above middle C for 200 milliseconds. `freq("A4")` is `440`. Names look like `C4`, `A#3`, and `Bb4`. `tone(440, 200, "square")` plays a frequency. `noise(80)` is a short hiss. `play("C4 E4 G4")` plays a tune, and `play("C4/120 rest E4/200")` sets each length.

`new Sound({ volume: 0.2 })` is a private board. `tone` and `note` without `new` use a shared one. Each call returns the event, including `frequency` and `ms`, and the board keeps them on `events`. With no audio device the event is still returned and nothing is thrown.

```
@sound as audio
let heard = audio.note("A4", 30)
print int(heard.frequency)
```

## hex

`Hex`, `Grid`, `hex`, `neighbor`, `neighbors`, `distance`, `ring`, `spiral`, `line`, `toPixel`, `fromPixel`, `add`, `round`, `key`, `parse`, `DIRECTIONS`.

Coordinates are axial. `q` is east, `r` is southeast, and `s` is `-q-r`. Direction 0 is east, then counterclockwise. The layout is pointy-top.

```
@hex

let here = hex(0, 0)
print distance(here, hex(2, -1))
print neighbor(here, 0).q
print len(ring(here, 1))
print len(spiral(here, 1))
print len(new Grid(1).hexes())
```

Those lines are `2`, `1`, `6`, `7`, and `7`. `toPixel(cell, size)` returns `{ x, y }`. `size` is the center-to-corner distance. `fromPixel(x, y, size)` returns the nearest cell. `key` is `"q,r"`, for a record or a map. `line(a, b)` includes both ends.

`hex(q, r)` and `new Hex(q, r)` build the same cell. A cell has `add`, `neighbor`, and `distance` methods as well as the free functions.

## games

`clamp`, `lerp`, `approach`, `choice`, `chance`, `range`, `wrap`, `Clock`, `Keys`, `Loop`, `Stage`, `Score`.

| Name | Meaning |
| --- | --- |
| `clamp(n, lo, hi)` | Keep `n` inside the range |
| `lerp(a, b, t)` | `a` plus `t` of the way to `b` |
| `approach(current, target, step)` | Move by at most `step` |
| `choice(list)` | One item, or `nil` |
| `chance(p)` | True with probability `p` |
| `range(n)` | `[0, 1, ... n-1]` |
| `wrap(n, length)` | Wrap into `0 .. length-1` |
| `Clock` | `now`, `lap`, `every(name, ms)` |
| `Keys` | `down`, `pressed`, `released`, `endFrame`, and `press` for tests |
| `Loop` | `start` on a frame timer, `run(frames, ms)` with no timer |
| `Stage` | `go(scene)`, then `update(dt)` and `draw` |
| `Score` | `add`, `value`, `best`, `reset` |

A scene is a record with `enter`, `update`, `draw`, and `leave`. `dt` is seconds.

```
@games

let stage = new Stage()
let steps = 0
stage.go({
  enter: fn()
    steps = steps + 1
  end,
  update: fn(dt)
    steps = steps + 1
  end
})
stage.update(0.016)

let loop = new Loop(fn(dt)
  steps = steps + 1
end)
loop.run(2, 16)
print steps
```

That prints `4`: one enter, one update, two loop steps.

`Keys` listens on `window` when there is one. Call `endFrame` once a frame so `pressed` is an edge and not a level. `examples/modules.magic` runs the headless checks for hex, games, and sound together.
