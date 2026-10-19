import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { bundle } from './bundle.js';
import { MagicError } from './error.js';
import { browserAssetFile } from './locate.js';
import { assetsFor } from './modules.js';
/**
 * Turns one Magic script into an Electron project.
 * It copies the browser builds the script actually imports.
 * It does not download Electron unless `build` is set.
 * `npm start` opens the window. `npm run pack` writes a standalone app. `npm run dist` writes installers.
 */
export class App {
    static pack(entry, options = {}) {
        const abs = path.resolve(entry);
        const stem = path.basename(abs).replace(/\.magic$/i, '') || 'game';
        const name = slug(options.name ?? stem);
        const title = options.title ?? name;
        const width = pixels(options.width, 960, 'width');
        const height = pixels(options.height, 720, 'height');
        const dir = path.resolve(options.out ?? path.join('build', name));
        const packed = bundle(abs, { target: 'script' });
        const assets = assetsFor(packed.modules);
        fs.mkdirSync(dir, { recursive: true });
        const engineDir = path.join(dir, 'engines');
        fs.mkdirSync(engineDir, { recursive: true });
        for (const asset of assets) {
            fs.copyFileSync(browserAssetFile(asset), path.join(engineDir, asset.file));
        }
        fs.writeFileSync(path.join(dir, 'game.js'), packed.code);
        fs.writeFileSync(path.join(dir, 'index.html'), html(title, assets.map((asset) => asset.file)));
        fs.writeFileSync(path.join(dir, 'main.js'), mainJs(title, width, height));
        fs.writeFileSync(path.join(dir, 'package.json'), packageJson(name, title));
        fs.writeFileSync(path.join(dir, 'README.md'), readme(title));
        let standalone = null;
        if (options.build)
            standalone = buildStandalone(dir);
        return { dir, modules: packed.modules, standalone };
    }
}
function buildStandalone(dir) {
    const install = spawnSync('npm', ['install'], { cwd: dir, stdio: 'inherit' });
    if (install.status !== 0)
        throw new MagicError('npm install failed in the Electron project');
    const packed = spawnSync('npm', ['run', 'pack'], { cwd: dir, stdio: 'inherit' });
    if (packed.status !== 0)
        throw new MagicError('npm run pack failed. The project is still in place.');
    const out = path.join(dir, 'dist');
    if (!fs.existsSync(out))
        throw new MagicError('electron-builder finished without a dist folder');
    return out;
}
function pixels(value, fallback, label) {
    const n = value ?? fallback;
    if (!Number.isFinite(n) || n <= 0)
        throw new MagicError(`${label} needs a positive number`);
    return Math.round(n);
}
function slug(name) {
    const cleaned = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    return cleaned || 'magic-app';
}
function packageJson(name, title) {
    return `${JSON.stringify({
        name,
        private: true,
        version: '0.1.0',
        description: title,
        type: 'module',
        main: 'main.js',
        scripts: {
            start: 'electron .',
            pack: 'electron-builder --dir',
            dist: 'electron-builder',
        },
        devDependencies: {
            electron: '^33.0.0',
            'electron-builder': '^25.1.8',
        },
        build: {
            appId: `lang.magic.${name}`,
            productName: title,
            directories: { output: 'dist' },
            files: ['main.js', 'index.html', 'game.js', 'engines/**/*', 'package.json'],
            asar: true,
        },
    }, null, 2)}\n`;
}
function mainJs(title, width, height) {
    return `import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));

function create() {
  const win = new BrowserWindow({
    width: ${width},
    height: ${height},
    title: ${JSON.stringify(title)},
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.loadFile(path.join(dir, 'index.html'));
}

app.whenReady().then(create);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) create();
});
`;
}
function html(title, files) {
    const tags = files.map((file) => `  <script src="./engines/${file}"></script>`).join('\n');
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeText(title)}</title>
  <style>
    html, body { margin: 0; background: #111; color: #ddd; }
    body { display: flex; min-height: 100vh; align-items: center; justify-content: center; }
  </style>
</head>
<body>
${tags}
  <script src="./game.js"></script>
</body>
</html>
`;
}
function readme(title) {
    return `# ${title}

This folder was packed by MAGIC.

Open the window:

\`\`\`bash
npm install
npm start
\`\`\`

Build a standalone app (a folder you can run without \`npm start\`):

\`\`\`bash
npm run pack
\`\`\`

The app lands in \`dist/\`. \`npm run dist\` writes installers for this machine instead of a plain folder.
`;
}
function escapeText(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
//# sourceMappingURL=app.js.map