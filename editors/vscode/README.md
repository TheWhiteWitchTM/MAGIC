# MAGIC for VS Code

Highlighting for `.magic` files. The grammar is the one in `lang/magic.tmLanguage.json`, copied here so the extension is self-contained.

From this folder:

```bash
ln -s "$(pwd)" ~/.vscode/extensions/magic-lang
```

Reload the window. Open a `.magic` file. `end` folds a block. `--` is a line comment.
