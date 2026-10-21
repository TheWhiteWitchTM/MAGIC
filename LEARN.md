# Learn MAGIC

Alpha. This is early work, and it can still change. Mira, [The White Witch™](https://thewhitewitchtm.github.io/whitewitch/). [X](https://x.com/TheWhiteWitchTM) · [thewhitewitchtm@google.com](mailto:thewhitewitchtm@google.com) · [GitHub](https://github.com/TheWhiteWitchTM) · [YouTube](https://youtube.com/@TheWhiteWitchTM) · [Bluesky](https://bsky.app/profile/thewhitewitchtm.sociallydead.me) · [MIT License](LICENSE)

MAGIC is a small language for people who are learning to program and for people who ship games. The rules are in [LANGUAGE.md](LANGUAGE.md). This page is the path through them. Each program is a whole file. Save it as `hello.magic` and run `magic run hello.magic`, or paste it into the playground that `magic serve` opens.

## Hello

```
print "Hello"
```

`print` writes one line. A newline ends the statement. `--` hides the rest of a line.

```
print "Hello" -- this is a note
```

## Names and text

```
let name = "Ada"
print "Hello, " .. name
```

`..` joins text. `let` is optional the first time you store a name: `name = "Ada"` is the same local. A second `let name` in the same block is an error. A `let` inside `if` or a loop ends when that block ends, so the name does not stay alive for the rest of the function.

Numbers are ordinary numbers. `10 / 4` is `2.5`. Text uses quotes. Three quotes span lines. `$"Hello, {name}!"` fills the `{expression}`. A list is `[1, 2, 3]`, and the first item is `bag[0]`. A record is `{ name: "Ada", hp: 3 }`, and you read `card.name` or `card["hp"]`.

`nil` means empty. `nil`, `false`, `0`, and `""` are the false values. Everything else is true, including a list.

## Choices and loops

```
if score > 0 then
  print "yes"
elseif score == 0 then
  print "zero"
else
  print "no"
end
```

`=` stores a value. `==` compares. `end` closes the block. `then` may be left off.

```
for i = 1 to 3
  print i
end

for item in ["wand", "map"]
  print item
end
```

`for i = 1 to 3` visits 1, then 2, then 3. Both ends count. The counter exists only inside the loop. `for item in` walks a list, and that name ends with the loop too.

## Functions

```
fn greet(name)
  return "Hello, " .. name
end

print greet("Ada")
print greet "Ada"
```

A function gives a value back with `return`. `greet "Ada"` is the same call as `greet("Ada")` when the only argument is a string written right there.

## A class

```
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

let counter = Counter(1)
print counter.bump()
```

`fn new` is the constructor. `Counter(1)` builds one. `self` is the object. `class Child is Parent` makes a child. Write the parent above the child.

## A module

A module is a library the language already knows. `@canvas` loads the picture module and gives you `Engine`.

```
@canvas

let engine = new Engine({ width: 320, height: 180 })
let spark = engine.sprite("✦", 40, 90, 28)
engine.motion(spark, 4, 0)

for i = 1 to 10
  engine.update()
end

print spark.x
```

`new` builds an engine object, because `Engine` is a JavaScript class. Your own classes can be called with or without `new`.

The modules are `canvas`, `terminal`, `2d`, `3d`, `ui`, `sound`, `hex`, and `games`. `@sound as audio` keeps them under one name, so `audio.note("A4", 200)` plays a note. `@3d as world` does the same for the 3D engine: `world.Engine`. [MODULES.md](MODULES.md) lists every export.

`use "canvas"` is the same load as `@canvas`. `import Engine from "canvas"` is the same module, for a file that wants one name and not the whole set.

## A file you wrote

A `.magic` file is a module. Every `fn`, `class`, and `let` at the top is an export. `examples/words.magic` is one:

```
fn greet(name)
  return "Hello, " .. name
end
```

Another file loads every export with `use`:

```
use "./words"
print greet("Ada")
```

`use "./helpers.js" as helpers` loads a JavaScript file under one name. `import` is there when you want a single name from a long list.

## A hex board

```
@hex

let here = hex(0, 0)
print distance(here, hex(2, -1))
print len(neighbors(here))
```

That prints `2`, then `6`. `new Grid(2)` is a disk of cells. `toPixel` and `fromPixel` turn a cell into a point on a canvas.

## Sound and a score

```
@sound as audio
@games

let board = new Score(0)
print board.add(10)

let heard = audio.note("C4", 180)
print heard.note
print int(heard.frequency)
```

With no speakers, the note is still returned, so the program can be checked. In a browser it also plays.

## Types, when you want them

```
@basic

let hp as number = 3

fn greet(name as string) as string
  return "Hello, " .. name
end
```

Four settings: `@none`, `@lazy`, `@basic`, `@strict`. None looks away. Lazy checks the line that wrote `as`. Basic checks that type when the name is used. Strict does that and also checks `private`. You do not have to write a type. An untyped name stays free. `public`, `private`, and `protected` belong on a class in a strict file.

## An app

```bash
magic app examples/scene.magic -o build/drift --title "Drift"
cd build/drift
npm install
npm start
```

`npm run pack` in that folder builds a standalone app. The steps are in [tools/electron.md](tools/electron.md).
