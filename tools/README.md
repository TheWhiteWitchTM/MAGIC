# Command line tools

Alpha. This is early work, and it can still change. Mira, [The White Witch™](https://thewhitewitchtm.github.io/whitewitch/). [X](https://x.com/TheWhiteWitchTM) · [thewhitewitchtm@google.com](mailto:thewhitewitchtm@google.com) · [GitHub](https://github.com/TheWhiteWitchTM) · [YouTube](https://youtube.com/@TheWhiteWitchTM) · [Bluesky](https://bsky.app/profile/thewhitewitchtm.sociallydead.me) · [MIT License](../LICENSE)

These programs sit next to `magic`. They are small, and they keep Magic easy to run.

| Command | Job |
| --- | --- |
| [`msx`](msx.md) | Run a `.magic` file the way `tsx` runs TypeScript |
| [`js2magic`](js2magic.md) | Turn JavaScript or TypeScript into a first-draft Magic script |

After `npm install` in this package:

```bash
npx msx examples/hello.magic
npx js2magic examples/sample.ts
```

From the built tree:

```bash
node dist/tools/msx.js examples/check.magic
node dist/tools/js2magic.js examples/sample.ts -o /tmp/sample.magic
```
