#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { App } from './app.js';
import { bundle } from './bundle.js';
import { MagicError } from './error.js';
import { Runtime } from './runtime.js';
import { startServer } from './serve.js';
const HELP = `MAGIC compiles a small language to JavaScript.

  magic run <file> [--strict]
  magic compile <file> [-o out.js] [--strict]
  magic app <file> [-o dir] [--title text] [--name slug] [--width n] [--height n]
  magic pack <file> [-o dir] [--title text] [--build]
  magic serve [--port n]
  magic help

  magic app writes an Electron project. npm start opens it.
  magic pack is the same project. npm run pack builds a standalone app.
  --build runs that pack before magic pack returns.
  magic serve opens the language site.

  msx and js2magic live in the tools folder. See tools/README.md.
`;
async function main() {
    const argv = process.argv.slice(2);
    const cmd = argv[0];
    if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
        process.stdout.write(HELP);
        return;
    }
    const parsed = parseArgs(argv.slice(1));
    if (cmd === 'run') {
        const runtime = new Runtime({ strict: parsed.flags['--strict'] === 'true' });
        await runtime.runFile(needFile(parsed.file));
        return;
    }
    if (cmd === 'compile') {
        const result = bundle(path.resolve(needFile(parsed.file)), {
            target: 'module',
            strict: parsed.flags['--strict'] === 'true',
        });
        const out = parsed.flags['-o'];
        if (out)
            fs.writeFileSync(path.resolve(out), result.code);
        else
            process.stdout.write(result.code);
        return;
    }
    if (cmd === 'app' || cmd === 'pack') {
        const packed = App.pack(path.resolve(needFile(parsed.file)), {
            out: parsed.flags['-o'],
            title: parsed.flags['--title'],
            name: parsed.flags['--name'],
            width: numberFlag(parsed.flags['--width'], '--width'),
            height: numberFlag(parsed.flags['--height'], '--height'),
            build: cmd === 'pack' && parsed.flags['--build'] === 'true',
        });
        process.stdout.write(`${packed.dir}\n`);
        if (packed.standalone)
            process.stdout.write(`${packed.standalone}\n`);
        else
            process.stdout.write('npm install && npm start\nnpm run pack\n');
        return;
    }
    if (cmd === 'serve') {
        const running = await startServer({ port: numberFlag(parsed.flags['--port'], '--port') });
        process.stdout.write(`${running.url}\n`);
        await new Promise(() => { });
        return;
    }
    throw new MagicError(`unknown command ${cmd}. Try magic help`);
}
function parseArgs(argv) {
    const flags = {};
    let file;
    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i] ?? '';
        if (arg.startsWith('-')) {
            if (arg === '--strict' || arg === '--build') {
                flags[arg] = 'true';
                continue;
            }
            const value = argv[i + 1];
            if (!value || value.startsWith('-'))
                throw new MagicError(`${arg} needs a value`);
            flags[arg] = value;
            i += 1;
            continue;
        }
        if (!file)
            file = arg;
    }
    return { file, flags };
}
function needFile(file) {
    if (!file)
        throw new MagicError('give Magic a script, for example magic run game.magic');
    return file;
}
function numberFlag(value, label) {
    if (value === undefined)
        return undefined;
    const n = Number(value);
    if (!Number.isFinite(n))
        throw new MagicError(`${label} needs a number`);
    return n;
}
main().catch((error) => {
    if (error instanceof MagicError)
        process.stderr.write(`${error.format()}\n`);
    else
        process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exit(1);
});
//# sourceMappingURL=cli.js.map