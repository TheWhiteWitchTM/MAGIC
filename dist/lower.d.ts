import type { Program } from './ast.js';
/**
 * `@canvas` and `@sound as audio` become imports.
 * The rest of the compiler then sees an ordinary module import.
 * A module annotation inside a function or a class is an error.
 */
export declare function lowerModules(program: Program): Program;
