# Changes

MAGIC 0.1.0 is the first release of the language as its own package.

- `@canvas`, `@terminal`, `@2d`, `@3d`, `@ui`, `@sound`, `@hex`, and `@games` load modules. `@name as local` binds the module under one name.
- `import` of those same names loads the same modules. `canvas` and `terminal` are the two halves of emoji-engine-2d. `2d` still means both.
- `sound`, `hex`, and `games` ship with the language.
- `magic app` and `magic pack` write an Electron project. `npm run pack` builds a standalone app. `magic pack --build` runs that step.
- `magic serve` serves the site, the docs, the examples, and the engine browser builds.
- `lang/` holds the JSON definition, the EBNF, the TextMate grammar, and the Vim syntax. `editors/vscode` is a highlighting extension.
