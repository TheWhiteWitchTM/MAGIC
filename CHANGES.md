# Changes

MAGIC 0.1.0 is the first release of the language as its own package.

- `@canvas`, `@terminal`, `@2d`, `@3d`, `@ui`, `@sound`, `@hex`, and `@games` load modules. `@name as local` binds the module under one name.
- `import` of those same names loads the same modules. `canvas` and `terminal` are the two halves of emoji-engine-2d. `2d` still means both.
- `sound`, `hex`, and `games` ship with the language.
- `magic app` and `magic pack` write an Electron project. `npm run pack` builds a standalone app. `magic pack --build` runs that step.
- `magic serve` serves the site, the docs, the examples, and the engine browser builds.
- `lang/` holds the JSON definition, the EBNF, the TextMate grammar, and the Vim syntax. `editors/vscode` is a highlighting extension.
- A local lives in the block that created it. An `if` arm, a loop, a `catch`, and a `for` counter do not keep the name after `end`. A nested function keeps a local only when that function was created inside the block and escaped.
- `"""` is a multiline string. `$"Hello, {name}!"`, `$'...'`, and `$"""..."""` are templates. `{{` writes a `{`.
- `use "canvas"` matches `@canvas`. `use "./words"` loads the exports of a Magic file you wrote. `use "./helpers.js" as helpers` loads JavaScript under one name.
- The compiler folds constant arithmetic, comparisons, and string joins, and it drops an `if` or `while` whose test is a constant `false`.
