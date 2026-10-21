# Electron

Alpha. This is early work, and it can still change. Mira, [The White Witch™](https://thewhitewitchtm.github.io/whitewitch/). [X](https://x.com/TheWhiteWitchTM) · [thewhitewitchtm@google.com](mailto:thewhitewitchtm@google.com) · [GitHub](https://github.com/TheWhiteWitchTM) · [YouTube](https://youtube.com/@TheWhiteWitchTM) · [Bluesky](https://bsky.app/profile/thewhitewitchtm.sociallydead.me) · [MIT License](../LICENSE)

`magic app` and `magic pack` compile a script to one classic JavaScript file and write an Electron project around it.

```bash
magic app examples/scene.magic -o build/drift --title "Drift" --width 960 --height 720
```

The folder contains:

| File | Role |
| --- | --- |
| `package.json` | `npm start`, `npm run pack`, `npm run dist` |
| `main.js` | The window. Context isolation on, node integration off, sandbox on |
| `index.html` | Loads the browser builds the script uses, then `game.js` |
| `game.js` | The compiled script |
| `engines/` | Only the builds that script imports |
| `README.md` | The same two commands |

Canvas and terminal copy `emoji-engine-2d.js`. 3D and UI copy their own browser builds. Sound, hex, and games copy `magic-stdlib.js`. A canvas game does not receive the stdlib, and a sound game does not receive a picture engine.

MAGIC does not download Electron while it writes the folder.

```bash
cd build/drift
npm install
npm start
```

## A standalone app

`npm run pack` runs electron-builder with `--dir`. The result is a folder under `dist/` that contains Electron and your game. You run that app directly. You do not run `npm start` inside it.

`npm run dist` asks electron-builder for installers on the current machine.

`magic pack` writes the same project as `magic app`. Add `--build` and MAGIC runs `npm install` and `npm run pack` before it returns. That step needs a network, and it takes a while.

```bash
magic pack examples/scene.magic -o build/drift --title "Drift" --build
```

The window title, the package name, and the app id come from the flags. The app id is `lang.magic.` plus the package name. The package name is the file name, lower cased, unless `--name` says otherwise.

## What the compiler emits

`magic compile file.magic -o game.js` writes an ES module. Engine and stdlib imports stay as package imports, so the module needs `magic` and the engines installed.

`magic app` asks for a classic script instead. That script reads `EmojiEngine`, `EmojiEngine3D`, `EmojiEngineUI`, and `MagicModules` from the page. The HTML loads those scripts first. A missing one throws `canvas is not loaded`, or the name of whichever module is missing, before the game starts.
