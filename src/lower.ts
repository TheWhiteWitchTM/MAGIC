import type { Annotation, Expr, ImportStmt, Program, Stmt } from './ast.js';
import { MagicError } from './error.js';
import { MODULES, moduleBySpecifier, moduleKey, type ModuleName } from './modules.js';

/**
 * `@canvas` and `@sound as audio` become imports.
 * The rest of the compiler then sees an ordinary module import.
 * A module annotation inside a function or a class is an error.
 */
export function lowerModules(program: Program): Program {
  const loads: ImportStmt[] = [];
  const seen = new Set<string>();
  const bound = new Map<string, string>();

  for (const stmt of program.body) {
    if (stmt.kind !== 'import') continue;
    if (stmt.form === 'namespace' && stmt.alias) bound.set(stmt.alias, stmt.specifier);
    for (const name of stmt.names) bound.set(name.local, stmt.specifier);
  }

  const claim = (local: string, from: string, ann: Annotation, mod: ModuleName): boolean => {
    const prev = bound.get(local);
    if (!prev) {
      bound.set(local, from);
      return true;
    }
    if (labelModule(prev) === mod && labelModule(from) === mod) return false;
    const hint = from.startsWith('@') ? ` Use ${from} as a name` : '';
    throw new MagicError(
      `${local} comes from both ${prev} and ${from}.${hint}`,
      ann.line,
      ann.column,
      program.filename,
    );
  };

  const addLoad = (ann: Annotation, mod: ModuleName): void => {
    const info = MODULES[mod];
    if (ann.alias) {
      const mark = `ns:${mod}:${ann.alias}`;
      if (seen.has(mark)) return;
      seen.add(mark);
      if (!claim(ann.alias, `@${mod}`, ann, mod)) return;
      loads.push({
        kind: 'import',
        form: 'namespace',
        specifier: info.name,
        alias: ann.alias,
        names: [],
        line: ann.line,
        column: ann.column,
      });
      return;
    }
    const mark = `all:${mod}`;
    if (seen.has(mark)) return;
    seen.add(mark);
    const names: { imported: string; local: string }[] = [];
    for (const imported of info.exports) {
      if (!claim(imported, `@${mod}`, ann, mod)) continue;
      names.push({ imported, local: imported });
    }
    if (names.length === 0) return;
    loads.push({
      kind: 'import',
      form: 'named',
      specifier: info.name,
      alias: null,
      names,
      line: ann.line,
      column: ann.column,
    });
  };

  const kept = (list: Annotation[] | undefined, top: boolean): Annotation[] => {
    if (!list || list.length === 0) return [];
    const keep: Annotation[] = [];
    for (const ann of list) {
      const mod = moduleKey(ann.name);
      if (!mod) {
        keep.push(ann);
        continue;
      }
      if (!top) {
        throw new MagicError(
          'a module annotation belongs at the top of the script',
          ann.line,
          ann.column,
          program.filename,
        );
      }
      if (ann.called || ann.args.length > 0) {
        throw new MagicError(
          `a module annotation does not take arguments. Write @${mod}`,
          ann.line,
          ann.column,
          program.filename,
        );
      }
      addLoad(ann, mod);
    }
    return keep;
  };

  const store = (node: { annotations?: Annotation[] }, top: boolean): void => {
    const next = kept(node.annotations, top);
    if (next.length > 0) node.annotations = next;
    else delete node.annotations;
  };

  program.annotations = kept(program.annotations, true);
  for (const stmt of program.body) {
    store(stmt, true);
    walkInside(stmt, (node) => store(node, false));
  }
  if (loads.length > 0) program.body = [...loads, ...program.body];
  expandStandardUses(program, claim);
  return program;
}

/** `use "canvas"` becomes a named import of every export. A file `use` stays a star. */
function expandStandardUses(program: Program, claim: (local: string, from: string, ann: Annotation, mod: ModuleName) => boolean): void {
  program.body = program.body.filter((stmt) => {
    if (stmt.kind !== 'import' || stmt.form !== 'star') return true;
    const info = moduleBySpecifier(stmt.specifier);
    if (!info) return true;
    const ann: Annotation = {
      name: info.name,
      args: [],
      called: false,
      alias: null,
      line: stmt.line,
      column: stmt.column,
    };
    const names: ImportStmt['names'] = [];
    for (const imported of info.exports) {
      if (!claim(imported, info.name, ann, info.name)) continue;
      names.push({ imported, local: imported });
    }
    if (names.length === 0) return false;
    stmt.form = 'named';
    stmt.names = names;
    stmt.specifier = info.name;
    return true;
  });
}

function labelModule(label: string): ModuleName | null {
  const bare = label.startsWith('@') ? label.slice(1) : label;
  return moduleKey(bare);
}

function walkInside(stmt: Stmt, visit: (node: { annotations?: Annotation[] }) => void): void {
  switch (stmt.kind) {
    case 'fn':
      for (const inner of stmt.body) walkStmt(inner, visit);
      return;
    case 'class':
      for (const field of stmt.fields) {
        visit(field);
        walkExpr(field.init, visit);
      }
      for (const method of stmt.methods) {
        visit(method);
        for (const inner of method.body) walkStmt(inner, visit);
      }
      return;
    case 'if':
      for (const arm of stmt.arms) {
        walkExpr(arm.test, visit);
        for (const inner of arm.body) walkStmt(inner, visit);
      }
      if (stmt.elseBody) {
        for (const inner of stmt.elseBody) walkStmt(inner, visit);
      }
      return;
    case 'while':
      walkExpr(stmt.test, visit);
      for (const inner of stmt.body) walkStmt(inner, visit);
      return;
    case 'repeat':
      for (const inner of stmt.body) walkStmt(inner, visit);
      walkExpr(stmt.test, visit);
      return;
    case 'for':
      if (stmt.from) walkExpr(stmt.from, visit);
      if (stmt.to) walkExpr(stmt.to, visit);
      if (stmt.step) walkExpr(stmt.step, visit);
      if (stmt.iter) walkExpr(stmt.iter, visit);
      for (const inner of stmt.body) walkStmt(inner, visit);
      return;
    case 'try':
      for (const inner of stmt.body) walkStmt(inner, visit);
      if (stmt.catchBody) {
        for (const inner of stmt.catchBody) walkStmt(inner, visit);
      }
      if (stmt.finallyBody) {
        for (const inner of stmt.finallyBody) walkStmt(inner, visit);
      }
      return;
    case 'let':
      if (stmt.init) walkExpr(stmt.init, visit);
      return;
    case 'assign':
      walkExpr(stmt.target, visit);
      walkExpr(stmt.value, visit);
      return;
    case 'expr':
      walkExpr(stmt.expr, visit);
      return;
    case 'print':
      for (const arg of stmt.args) walkExpr(arg, visit);
      return;
    case 'return':
      if (stmt.value) walkExpr(stmt.value, visit);
      return;
    case 'throw':
      walkExpr(stmt.value, visit);
      return;
    default:
      return;
  }
}

function walkStmt(stmt: Stmt, visit: (node: { annotations?: Annotation[] }) => void): void {
  visit(stmt);
  walkInside(stmt, visit);
}

function walkExpr(expr: Expr, visit: (node: { annotations?: Annotation[] }) => void): void {
  switch (expr.kind) {
    case 'fn':
      for (const inner of expr.body) walkStmt(inner, visit);
      return;
    case 'list':
      for (const item of expr.items) walkExpr(item, visit);
      return;
    case 'record':
      for (const field of expr.fields) walkExpr(field.value, visit);
      return;
    case 'unary':
    case 'await':
      walkExpr(expr.expr, visit);
      return;
    case 'binary':
      walkExpr(expr.left, visit);
      walkExpr(expr.right, visit);
      return;
    case 'call':
    case 'new':
      walkExpr(expr.callee, visit);
      for (const arg of expr.args) walkExpr(arg, visit);
      return;
    case 'member':
      walkExpr(expr.object, visit);
      return;
    case 'index':
      walkExpr(expr.object, visit);
      walkExpr(expr.index, visit);
      return;
    case 'super':
      for (const arg of expr.args) walkExpr(arg, visit);
      return;
    case 'template':
      for (const part of expr.parts) {
        if ('expr' in part) walkExpr(part.expr, visit);
      }
      return;
    default:
      return;
  }
}
