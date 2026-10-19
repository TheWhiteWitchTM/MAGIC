/**
 * Browser build of the modules that ship with MAGIC.
 * A page loads this script, then reads `MagicModules.sound`, `.hex`, and `.games`.
 */
import * as games from './games.js';
import * as hex from './hex.js';
import * as sound from './sound.js';

const host = globalThis as { MagicModules?: Record<string, unknown> };
const modules = host.MagicModules ?? {};
modules.sound = sound;
modules.hex = hex;
modules.games = games;
host.MagicModules = modules;
