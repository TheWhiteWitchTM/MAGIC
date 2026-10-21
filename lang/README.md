# Language definitions

Alpha. This is early work, and it can still change. Mira, [The White Witch™](https://thewhitewitchtm.github.io/whitewitch/). [X](https://x.com/TheWhiteWitchTM) · [thewhitewitchtm@google.com](mailto:thewhitewitchtm@google.com) · [GitHub](https://github.com/TheWhiteWitchTM) · [YouTube](https://youtube.com/@TheWhiteWitchTM) · [Bluesky](https://bsky.app/profile/thewhitewitchtm.sociallydead.me) · [MIT License](../LICENSE)

These files describe MAGIC for tools. [LANGUAGE.md](../LANGUAGE.md) is the meaning. If a file here and LANGUAGE.md disagree, LANGUAGE.md wins, and the file here should be fixed.

| File | Use |
| --- | --- |
| `magic.language.json` | Keywords, builtins, modules, exports, and precedence. A compiler or a documentation generator can read this. |
| `magic.ebnf` | The shape of a program. |
| `magic.tmLanguage.json` | TextMate grammar for syntax highlighting. |
| `magic.vim` | Vim syntax. |

The VS Code extension in [editors/vscode](../editors/vscode) uses the TextMate grammar. The demo checks that `magic.language.json` lists the same keywords, builtins, and module exports as the compiler.
