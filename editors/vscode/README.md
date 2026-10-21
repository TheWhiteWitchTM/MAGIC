# MAGIC for VS Code

Alpha. This is early work, and it can still change. Mira, [The White Witch™](https://thewhitewitchtm.github.io/whitewitch/). [X](https://x.com/TheWhiteWitchTM) · [thewhitewitchtm@google.com](mailto:thewhitewitchtm@google.com) · [GitHub](https://github.com/TheWhiteWitchTM) · [YouTube](https://youtube.com/@TheWhiteWitchTM) · [Bluesky](https://bsky.app/profile/thewhitewitchtm.sociallydead.me) · [MIT License](../../LICENSE)

Highlighting for `.magic` files. The grammar is the one in `lang/magic.tmLanguage.json`, copied here so the extension is self-contained.

From this folder:

```bash
ln -s "$(pwd)" ~/.vscode/extensions/magic-lang
```

Reload the window. Open a `.magic` file. `end` folds a block. `--` is a line comment.
