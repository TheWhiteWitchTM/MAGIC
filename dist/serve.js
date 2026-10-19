import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { packageRoot, siblingBrowser } from './locate.js';
const PAGES = {
    '/': 'index.html',
    '/learn': 'learn.html',
    '/modules': 'modules.html',
    '/tools': 'tools.html',
    '/play': 'play.html',
    '/language': 'language.html',
};
const TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8',
    '.ebnf': 'text/plain; charset=utf-8',
    '.vim': 'text/plain; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.magic': 'text/plain; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
};
/**
 * Serve the language site, the examples, the browser builds, and the sibling engines.
 * Engine scripts are read from the packages next to this one, so a page can load them.
 */
export function startServer(options = {}) {
    const root = path.resolve(options.root ?? packageRoot());
    const site = path.join(root, 'site');
    const host = options.host ?? '127.0.0.1';
    const port = options.port ?? 8740;
    const server = http.createServer((req, res) => {
        try {
            const url = new URL(req.url ?? '/', `http://${host}`);
            const pathname = decodeURIComponent(url.pathname);
            const file = resolveFile(root, site, pathname);
            if (!file) {
                res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
                res.end('not found\n');
                return;
            }
            const body = fs.readFileSync(file);
            const ext = path.extname(file).toLowerCase();
            res.writeHead(200, {
                'content-type': TYPES[ext] ?? 'application/octet-stream',
                'cache-control': 'no-cache',
            });
            res.end(body);
        }
        catch {
            res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
            res.end('serve failed\n');
        }
    });
    return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, host, () => {
            const addr = server.address();
            const actual = typeof addr === 'object' && addr ? addr.port : port;
            resolve({
                port: actual,
                url: `http://${host}:${actual}/`,
                close: () => new Promise((done, fail) => {
                    server.close((error) => (error ? fail(error) : done()));
                }),
            });
        });
    });
}
function resolveFile(root, site, pathname) {
    const page = PAGES[pathname];
    if (page)
        return existing(path.join(site, page));
    const engine = /^\/(emoji-engine-2d|emoji-engine-3d|emoji-engine-ui)\/browser\/([^/]+)$/.exec(pathname);
    if (engine) {
        const pkg = engine[1] ?? '';
        const file = engine[2] ?? '';
        return siblingBrowser(pkg, file);
    }
    const fromRoot = safeJoin(root, pathname);
    if (fromRoot && fs.existsSync(fromRoot) && fs.statSync(fromRoot).isFile())
        return fromRoot;
    const fromSite = safeJoin(site, pathname);
    if (fromSite && fs.existsSync(fromSite) && fs.statSync(fromSite).isFile())
        return fromSite;
    return null;
}
function existing(file) {
    return fs.existsSync(file) ? file : null;
}
function safeJoin(root, pathname) {
    const cleaned = pathname.replace(/^\/+/, '');
    if (cleaned.includes('\0'))
        return null;
    const full = path.resolve(root, cleaned);
    const base = path.resolve(root);
    if (full !== base && !full.startsWith(base + path.sep))
        return null;
    return full;
}
//# sourceMappingURL=serve.js.map