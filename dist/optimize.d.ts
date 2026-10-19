import type { Expr } from './ast.js';
/**
 * Folds constants and drops sides that Magic would not run.
 * `false and side()` becomes `false`. A local that lives only in a dead
 * branch is never emitted, so it cannot stay alive for the rest of the call.
 */
export declare function foldExpr(expr: Expr): Expr;
/** `true` or `false` when the value is a folded constant. Anything else is unknown. */
export declare function constantTruth(expr: Expr): boolean | null;
