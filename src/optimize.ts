import type { BinaryExpr, Expr, UnaryExpr } from './ast.js';

/**
 * Folds constants and drops sides that Magic would not run.
 * `false and side()` becomes `false`. A local that lives only in a dead
 * branch is never emitted, so it cannot stay alive for the rest of the call.
 */
export function foldExpr(expr: Expr): Expr {
  switch (expr.kind) {
    case 'unary': {
      const inner = foldExpr(expr.expr);
      return foldUnary(expr, inner);
    }
    case 'binary': {
      const left = foldExpr(expr.left);
      const right = foldExpr(expr.right);
      return foldBinary(expr, left, right);
    }
    case 'template': {
      const parts = expr.parts.map((part) => ('expr' in part ? { expr: foldExpr(part.expr) } : part));
      let text = '';
      for (const part of parts) {
        if ('text' in part) text += part.text;
        else if (part.expr.kind === 'string') text += part.expr.value;
        else return { ...expr, parts };
      }
      return { kind: 'string', value: text, line: expr.line, column: expr.column };
    }
    case 'list':
      return { ...expr, items: expr.items.map((item) => foldExpr(item)) };
    case 'record':
      return { ...expr, fields: expr.fields.map((field) => ({ ...field, value: foldExpr(field.value) })) };
    case 'call':
    case 'new':
      return {
        ...expr,
        callee: foldExpr(expr.callee),
        args: expr.args.map((arg) => foldExpr(arg)),
      };
    case 'member':
      return { ...expr, object: foldExpr(expr.object) };
    case 'index':
      return { ...expr, object: foldExpr(expr.object), index: foldExpr(expr.index) };
    case 'await':
      return { ...expr, expr: foldExpr(expr.expr) };
    case 'super':
      return { ...expr, args: expr.args.map((arg) => foldExpr(arg)) };
    default:
      return expr;
  }
}

/** `true` or `false` when the value is a folded constant. Anything else is unknown. */
export function constantTruth(expr: Expr): boolean | null {
  switch (expr.kind) {
    case 'nil':
      return false;
    case 'bool':
      return expr.value;
    case 'number':
      return expr.value !== 0 && !Number.isNaN(expr.value);
    case 'string':
      return expr.value !== '';
    case 'list':
    case 'record':
    case 'fn':
      return true;
    default:
      return null;
  }
}

function foldUnary(expr: UnaryExpr, inner: Expr): Expr {
  if (expr.op === 'not') {
    const truth = constantTruth(inner);
    if (truth === null) return { ...expr, expr: inner };
    return { kind: 'bool', value: !truth, line: expr.line, column: expr.column };
  }
  if (expr.op === '-' && inner.kind === 'number') return numberExpr(-inner.value, expr);
  if (expr.op === '#' && inner.kind === 'string') return numberExpr(Array.from(inner.value).length, expr);
  if (expr.op === '#' && inner.kind === 'list') return numberExpr(inner.items.length, expr);
  if (expr.op === '#' && inner.kind === 'record') {
    const keys = new Set(inner.fields.map((field) => field.name));
    return numberExpr(keys.size, expr);
  }
  return { ...expr, expr: inner };
}

function foldBinary(expr: BinaryExpr, left: Expr, right: Expr): Expr {
  if (expr.op === 'and' || expr.op === 'or') {
    const truth = constantTruth(left);
    if (truth === null) return { ...expr, left, right };
    if (expr.op === 'and') return truth ? right : left;
    return truth ? left : right;
  }
  if (expr.op === '&') {
    const text = constText(left);
    const more = constText(right);
    if (text !== null && more !== null) return { kind: 'string', value: text + more, line: expr.line, column: expr.column };
    return { ...expr, left, right };
  }
  if (left.kind === 'number' && right.kind === 'number') {
    const value = numberOp(expr.op, left.value, right.value);
    if (value !== null) return numberExpr(value, expr);
    const compared = compareOp(expr.op, left.value, right.value);
    if (compared !== null) return { kind: 'bool', value: compared, line: expr.line, column: expr.column };
  }
  if (expr.op === '+' && constText(left) !== null && constText(right) !== null) {
    return { kind: 'string', value: `${constText(left)}${constText(right)}`, line: expr.line, column: expr.column };
  }
  if ((expr.op === '==' || expr.op === '!=' || expr.op === '<>') && bothConst(left) && bothConst(right)) {
    const same = sameConst(left, right);
    if (same !== null) {
      const yes = expr.op === '==' ? same : !same;
      return { kind: 'bool', value: yes, line: expr.line, column: expr.column };
    }
  }
  if ((expr.op === '<' || expr.op === '>' || expr.op === '<=' || expr.op === '>=') && left.kind === 'string' && right.kind === 'string') {
    const compared = compareOp(expr.op, left.value, right.value);
    if (compared !== null) return { kind: 'bool', value: compared, line: expr.line, column: expr.column };
  }
  return { ...expr, left, right };
}

function numberOp(op: string, left: number, right: number): number | null {
  switch (op) {
    case '+':
      return left + right;
    case '-':
      return left - right;
    case '*':
      return left * right;
    case '/':
      return left / right;
    case '%':
      return left % right;
    case '^':
      return left ** right;
    default:
      return null;
  }
}

function compareOp(op: string, left: number | string, right: number | string): boolean | null {
  switch (op) {
    case '==':
      return left === right;
    case '!=':
    case '<>':
      return left !== right;
    case '<':
      return left < right;
    case '>':
      return left > right;
    case '<=':
      return left <= right;
    case '>=':
      return left >= right;
    default:
      return null;
  }
}

function constText(expr: Expr): string | null {
  if (expr.kind === 'string') return expr.value;
  if (expr.kind === 'number') return String(expr.value);
  if (expr.kind === 'bool') return expr.value ? 'true' : 'false';
  if (expr.kind === 'nil') return '';
  return null;
}

function bothConst(expr: Expr): boolean {
  return expr.kind === 'number' || expr.kind === 'string' || expr.kind === 'bool' || expr.kind === 'nil';
}

function sameConst(left: Expr, right: Expr): boolean | null {
  if (left.kind === 'nil' && right.kind === 'nil') return true;
  if (left.kind === 'nil' || right.kind === 'nil') return false;
  if (left.kind === 'number' && right.kind === 'number') return left.value === right.value;
  if (left.kind === 'string' && right.kind === 'string') return left.value === right.value;
  if (left.kind === 'bool' && right.kind === 'bool') return left.value === right.value;
  return null;
}

function numberExpr(value: number, at: { line: number; column: number }): Expr {
  let raw: string;
  if (Number.isNaN(value)) raw = 'NaN';
  else if (value === Infinity) raw = 'Infinity';
  else if (value === -Infinity) raw = '-Infinity';
  else raw = String(value);
  return { kind: 'number', raw, value, line: at.line, column: at.column };
}
