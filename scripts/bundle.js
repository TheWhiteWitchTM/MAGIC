import esbuild from 'esbuild';
import { readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const shared = {
  absWorkingDir: root,
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  charset: 'utf8',
};

await esbuild.build({
  ...shared,
  entryPoints: ['dist/browser.js'],
  globalName: 'Magic',
  footer: {
    js: 'globalThis.Magic = Magic;\nglobalThis.MAGIC = Magic;',
  },
  outfile: 'browser/magic.js',
});

const minFile = 'browser/magic.min.js';

await esbuild.build({
  ...shared,
  stdin: {
    contents: `import { compile, Lexer, Parser, Compiler, MagicError } from './src/browser.ts';
const Magic = { compile, Lexer, Parser, Compiler, MagicError };
globalThis.Magic = Magic;
globalThis.MAGIC = Magic;
`,
    resolveDir: root,
    sourcefile: 'magic.ts',
    loader: 'ts',
  },
  minify: true,
  legalComments: 'none',
  treeShaking: true,
  outfile: minFile,
});

await esbuild.build({
  ...shared,
  entryPoints: ['dist/modules/browser-entry.js'],
  outfile: 'browser/magic-stdlib.js',
});

for (const stale of [
  'dist/magic.js',
  'dist/magic.min.js',
  'browser/emoji-engine-magic.js',
  'browser/emoji-engine-magic.min.js',
]) {
  rmSync(path.join(root, stale), { force: true });
}

const bytes = readFileSync(path.join(root, minFile));
const gzip = gzipSync(bytes).length;
console.log(`${minFile} ${bytes.length} bytes, ${gzip} gzip`);
