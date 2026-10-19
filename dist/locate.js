import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { MagicError } from './error.js';
import { MODULES, assetById } from './modules.js';
/** Directory of this package, whether the file running is `src` or `dist`. */
export function packageRoot() {
    return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}
/**
 * Absolute path of a module's implementation.
 * Node cannot resolve a package from a script written under `/tmp`, so the
 * runtime imports this file by URL. A missing engine falls back to the sibling folder.
 */
export function moduleEntry(name) {
    const info = MODULES[name];
    if (info.source.kind === 'file') {
        const file = path.join(packageRoot(), info.source.file);
        if (fs.existsSync(file))
            return file;
        throw new MagicError(`cannot find ${info.source.file}. Run npm run build in MAGIC.`);
    }
    const pkg = info.source.package;
    try {
        const require = createRequire(path.join(packageRoot(), 'package.json'));
        return require.resolve(pkg);
    }
    catch {
        const fallback = path.resolve(packageRoot(), '..', pkg, 'dist', 'index.js');
        if (fs.existsSync(fallback))
            return fallback;
        throw new MagicError(`cannot find ${pkg}. Install it next to MAGIC.`);
    }
}
/** `file:` URL of that module entry. */
export function moduleFileUrl(name) {
    return pathToFileURL(moduleEntry(name)).href;
}
/**
 * A script-tag build: an engine's `browser/` file, or MAGIC's own `magic-stdlib.js`.
 */
export function browserAssetFile(asset) {
    if (asset.package === 'self') {
        const file = path.join(packageRoot(), 'browser', asset.file);
        if (fs.existsSync(file))
            return file;
        throw new MagicError(`cannot find browser/${asset.file}. Run npm run build in MAGIC.`);
    }
    const candidates = [];
    try {
        const require = createRequire(path.join(packageRoot(), 'package.json'));
        const entry = require.resolve(asset.package);
        candidates.push(path.resolve(path.dirname(entry), '..', 'browser', asset.file));
    }
    catch {
        // The sibling folder is the second chance.
    }
    candidates.push(path.resolve(packageRoot(), '..', asset.package, 'browser', asset.file));
    for (const file of candidates) {
        if (fs.existsSync(file))
            return file;
    }
    throw new MagicError(`cannot find browser/${asset.file}. Run npm run build in ${asset.package}.`);
}
/** Sibling engine browser file, used by `magic serve`. */
export function siblingBrowser(packageName, file) {
    const asset = assetById(packageName) ?? {
        id: packageName,
        file,
        package: packageName,
        global: null,
    };
    if (asset.package === 'self')
        return null;
    const direct = path.resolve(packageRoot(), '..', packageName, 'browser', file);
    if (fs.existsSync(direct))
        return direct;
    try {
        return browserAssetFile({ ...asset, file, package: packageName });
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=locate.js.map