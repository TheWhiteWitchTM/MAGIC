/**
 * Modules a Magic script can load with `@name` or `import ... from "name"`.
 * Canvas and terminal are the two halves of emoji-engine-2d.
 * 3d and ui are the other engines. Sound, hex, and games ship with MAGIC.
 */
export const BROWSER_ASSETS = [
    { id: 'emoji-engine-2d', file: 'emoji-engine-2d.js', package: 'emoji-engine-2d', global: 'EmojiEngine' },
    { id: 'emoji-engine-3d', file: 'emoji-engine-3d.js', package: 'emoji-engine-3d', global: 'EmojiEngine3D' },
    { id: 'emoji-engine-ui', file: 'emoji-engine-ui.js', package: 'emoji-engine-ui', global: 'EmojiEngineUI' },
    { id: 'magic-stdlib', file: 'magic-stdlib.js', package: 'self', global: 'MagicModules' },
];
const CANVAS_EXPORTS = ['Canvas', 'Engine', 'Utilities'];
const TERMINAL_EXPORTS = ['Terminal', 'Utilities'];
const PICTURE_EXPORTS = ['Canvas', 'Terminal', 'Engine', 'Utilities'];
const UI_EXPORTS = [
    'Application',
    'messageBox',
    'confirm',
    'MenuBar',
    'StatusLine',
    'borland',
    'copyTheme',
    'linux',
    'theme',
    'Desktop',
    'Group',
    'View',
    'Button',
    'CheckBox',
    'InputLine',
    'Label',
    'ListBox',
    'ProgressBar',
    'RadioGroup',
    'ScrollBar',
    'StaticText',
    'Dialog',
    'Window',
];
export const MODULES = {
    canvas: {
        name: 'canvas',
        summary: 'A bitmap, sprites, and the frame loop.',
        specifier: 'magic/canvas',
        source: { kind: 'file', file: 'dist/modules/canvas.js' },
        exports: CANVAS_EXPORTS,
        asset: 'emoji-engine-2d',
        script: 'globalThis.EmojiEngine',
    },
    terminal: {
        name: 'terminal',
        summary: 'A cell grid for text, panels, and roguelike screens.',
        specifier: 'magic/terminal',
        source: { kind: 'file', file: 'dist/modules/terminal.js' },
        exports: TERMINAL_EXPORTS,
        asset: 'emoji-engine-2d',
        script: 'globalThis.EmojiEngine',
    },
    '2d': {
        name: '2d',
        summary: 'Canvas and terminal together, the whole emoji-engine-2d package.',
        specifier: 'emoji-engine-2d',
        source: { kind: 'package', package: 'emoji-engine-2d' },
        exports: PICTURE_EXPORTS,
        asset: 'emoji-engine-2d',
        script: 'globalThis.EmojiEngine',
    },
    '3d': {
        name: '3d',
        summary: 'A 3D scene, a camera, and billboards.',
        specifier: 'emoji-engine-3d',
        source: { kind: 'package', package: 'emoji-engine-3d' },
        exports: PICTURE_EXPORTS,
        asset: 'emoji-engine-3d',
        script: 'globalThis.EmojiEngine3D',
    },
    ui: {
        name: 'ui',
        summary: 'Windows, buttons, and menus on a terminal.',
        specifier: 'emoji-engine-ui',
        source: { kind: 'package', package: 'emoji-engine-ui' },
        exports: UI_EXPORTS,
        asset: 'emoji-engine-ui',
        script: 'globalThis.EmojiEngineUI',
    },
    sound: {
        name: 'sound',
        summary: 'Tones, notes, and noise.',
        specifier: 'magic/sound',
        source: { kind: 'file', file: 'dist/modules/sound.js' },
        exports: ['Sound', 'tone', 'note', 'noise', 'play', 'freq'],
        asset: 'magic-stdlib',
        script: '(globalThis.MagicModules && globalThis.MagicModules.sound)',
    },
    hex: {
        name: 'hex',
        summary: 'Hex grids, neighbors, distance, and pixel layout.',
        specifier: 'magic/hex',
        source: { kind: 'file', file: 'dist/modules/hex.js' },
        exports: [
            'Hex',
            'Grid',
            'hex',
            'neighbor',
            'neighbors',
            'distance',
            'ring',
            'spiral',
            'line',
            'toPixel',
            'fromPixel',
            'add',
            'round',
            'key',
            'parse',
            'DIRECTIONS',
        ],
        asset: 'magic-stdlib',
        script: '(globalThis.MagicModules && globalThis.MagicModules.hex)',
    },
    games: {
        name: 'games',
        summary: 'Loops, keys, scenes, scores, and small bits of arithmetic.',
        specifier: 'magic/games',
        source: { kind: 'file', file: 'dist/modules/games.js' },
        exports: [
            'clamp',
            'lerp',
            'approach',
            'choice',
            'chance',
            'range',
            'wrap',
            'Clock',
            'Keys',
            'Loop',
            'Stage',
            'Score',
        ],
        asset: 'magic-stdlib',
        script: '(globalThis.MagicModules && globalThis.MagicModules.games)',
    },
};
const ORDER = ['canvas', 'terminal', '2d', '3d', 'ui', 'sound', 'hex', 'games'];
const ALIASES = {
    canvas: 'canvas',
    terminal: 'terminal',
    '2d': '2d',
    'emoji-engine-2d': '2d',
    '3d': '3d',
    'emoji-engine-3d': '3d',
    ui: 'ui',
    'emoji-engine-ui': 'ui',
    sound: 'sound',
    hex: 'hex',
    games: 'games',
};
/** Short name or package name, or null when the specifier is not a Magic module. */
export function moduleKey(specifier) {
    return ALIASES[specifier] ?? null;
}
export function moduleBySpecifier(specifier) {
    const key = moduleKey(specifier);
    return key ? MODULES[key] : null;
}
export function moduleOrder() {
    return ORDER.slice();
}
export function moduleNs(name) {
    return `__magic_mod_${name.replace(/[^A-Za-z0-9_]/g, '_')}`;
}
export function assetsFor(names) {
    const ids = new Set();
    for (const name of names) {
        const id = MODULES[name].asset;
        if (id)
            ids.add(id);
    }
    return BROWSER_ASSETS.filter((asset) => ids.has(asset.id));
}
export function assetById(id) {
    return BROWSER_ASSETS.find((asset) => asset.id === id) ?? null;
}
/** `canvas has no Terminal. Terminal is exported by terminal, 2d, 3d.` */
export function missingExport(moduleName, imported) {
    const homes = [];
    for (const mod of Object.values(MODULES)) {
        if (mod.exports.includes(imported))
            homes.push(mod.name);
    }
    const tail = homes.length > 0 ? ` ${imported} is exported by ${homes.join(', ')}.` : '';
    return `${moduleName} has no ${imported}.${tail}`;
}
const JS_EXT = /\.(js|mjs|cjs|json)$/i;
/**
 * A Magic script import, as opposed to a module or a plain JavaScript file.
 * `./witch` counts. `./notes.js` does not.
 */
export function isMagicSpecifier(specifier) {
    if (moduleKey(specifier))
        return false;
    if (specifier.endsWith('.magic'))
        return true;
    if (specifier.startsWith('./') || specifier.startsWith('../')) {
        if (JS_EXT.test(specifier))
            return false;
        return true;
    }
    return false;
}
/** A JavaScript or JSON module. Package names are included when they end in those extensions. */
export function isJsSpecifier(specifier) {
    if (moduleKey(specifier))
        return false;
    return JS_EXT.test(specifier);
}
/**
 * A JS or JSON file next to the importer.
 * `./math.js` counts. `lodash` does not. `pkg/index.js` is left to the package resolver.
 */
export function isRelativeJsSpecifier(specifier) {
    if (!isJsSpecifier(specifier))
        return false;
    return specifier.startsWith('./') || specifier.startsWith('../');
}
//# sourceMappingURL=modules.js.map