"use strict";
var Magic = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // dist/browser.js
  var browser_exports = {};
  __export(browser_exports, {
    Compiler: () => Compiler,
    Lexer: () => Lexer,
    MagicError: () => MagicError,
    Parser: () => Parser,
    compile: () => compile
  });

  // dist/error.js
  var MagicError = class extends Error {
    line;
    column;
    filename;
    constructor(message, line = 1, column = 1, filename = "") {
      super(message);
      this.name = "MagicError";
      this.line = line;
      this.column = column;
      this.filename = filename;
    }
    /** `file:line:column message`, ready for a terminal. */
    format() {
      const where = this.filename ? `${this.filename}:${this.line}:${this.column}` : `${this.line}:${this.column}`;
      return `${where} ${this.message}`;
    }
  };

  // dist/check.js
  var MODE_BY_NAME = {
    none: "none",
    off: "none",
    normal: "none",
    lazy: "lazy",
    basic: "basic",
    strict: "strict"
  };
  function fallbackTypeMode(options) {
    if (options?.types)
      return options.types;
    return options?.strict ? "strict" : "none";
  }
  function fileTypeMode(program, fallback = "none") {
    let mode = fallback;
    for (const ann of fileAnnotations(program)) {
      const next = MODE_BY_NAME[ann.name];
      if (next)
        mode = next;
    }
    return mode;
  }
  function checkProgram(program, filename, strictOrMode = false) {
    const mode = typeof strictOrMode === "string" ? strictOrMode : strictOrMode ? "strict" : "none";
    new Checker(filename, mode).check(program);
  }
  var ANY = { tag: "any" };
  var NIL = { tag: "nil" };
  var NUMBER = { tag: "number" };
  var STRING = { tag: "string" };
  var BOOL = { tag: "bool" };
  var FN = { tag: "fn" };
  var LIST = { tag: "list" };
  var RECORD = { tag: "record" };
  var PRIMITIVE = {
    any: ANY,
    number: NUMBER,
    int: NUMBER,
    string: STRING,
    bool: BOOL,
    boolean: BOOL,
    fn: FN,
    list: LIST,
    record: RECORD,
    nil: NIL
  };
  var Checker = class {
    filename;
    mode;
    classes = /* @__PURE__ */ new Map();
    stack = [];
    builtins = /* @__PURE__ */ new Map();
    className = null;
    returnType = null;
    constructor(filename, mode) {
      this.filename = filename;
      this.mode = mode;
    }
    /** basic and strict follow a written type to the places it is used. lazy stays on the line that wrote it. */
    get checksUses() {
      return this.mode === "basic" || this.mode === "strict";
    }
    get checksAccess() {
      return this.mode === "strict";
    }
    check(program) {
      const top = /* @__PURE__ */ new Map();
      this.seedBuiltins(top);
      this.stack.push(top);
      this.collectClasses(program.body);
      this.declareSurface(program.body, top);
      if (this.mode !== "strict")
        this.rejectAccess(program.body);
      if (this.mode === "none")
        return;
      this.walkBody(program.body);
    }
    collectClasses(body) {
      for (const stmt of body) {
        if (stmt.kind !== "class")
          continue;
        const members = /* @__PURE__ */ new Map();
        let ctor = { tag: "fn", params: [], returns: { tag: "class", className: stmt.name } };
        for (const field of stmt.fields) {
          members.set(field.name, {
            access: field.access ?? "public",
            type: this.fromRef(field.type),
            kind: "field"
          });
        }
        for (const method of stmt.methods) {
          const type = this.fnType(method.params, method.type);
          if (method.name === "new") {
            ctor = { tag: "fn", params: method.params.map((param) => this.fromRef(param.type)), returns: { tag: "class", className: stmt.name } };
            members.set("new", { access: method.access ?? "public", type, kind: "ctor" });
          } else {
            members.set(method.name, { access: method.access ?? "public", type, kind: "method" });
          }
        }
        this.classes.set(stmt.name, { name: stmt.name, parent: stmt.parent, members, ctor, node: stmt });
      }
    }
    declareSurface(body, scope) {
      for (const stmt of body) {
        switch (stmt.kind) {
          case "import":
            if (stmt.form === "namespace" && stmt.alias)
              this.bind(scope, stmt.alias, ANY);
            for (const name of stmt.names)
              this.bind(scope, name.local, ANY);
            break;
          case "fn":
            this.bind(scope, stmt.name, this.fnType(stmt.params, stmt.type));
            break;
          case "class":
            this.bind(scope, stmt.name, this.classes.get(stmt.name)?.ctor ?? FN);
            break;
          case "let":
            this.bind(scope, stmt.name, stmt.type ? this.fromRef(stmt.type) : ANY);
            break;
          case "assign":
            if (stmt.target.kind === "name" && !this.lookupBind(stmt.target.name) && !scope.has(stmt.target.name)) {
              this.bind(scope, stmt.target.name, ANY);
            }
            break;
          default:
            break;
        }
      }
    }
    rejectAccess(body) {
      for (const stmt of body) {
        if (stmt.kind !== "class")
          continue;
        for (const field of stmt.fields) {
          if (field.access)
            this.oops(field, `${field.access} belongs in a @strict class`);
        }
        for (const method of stmt.methods) {
          if (method.access)
            this.oops(method, `${method.access} belongs in a @strict class`);
        }
      }
    }
    walkBody(body) {
      for (const stmt of body)
        this.walkStmt(stmt);
    }
    walkStmt(stmt) {
      switch (stmt.kind) {
        case "import":
          return;
        case "fn":
          this.walkFn(stmt.body, stmt.params, stmt.type);
          return;
        case "class":
          this.walkClass(stmt);
          return;
        case "let":
          if (stmt.init) {
            const got = this.infer(stmt.init);
            const bind = this.lookupBind(stmt.name);
            if (bind) {
              if (bind.declared.tag !== "any")
                this.assignCheck(stmt, got, bind.declared);
              bind.inferred = got;
            }
          }
          return;
        case "assign":
          this.walkAssign(stmt);
          return;
        case "print":
          for (const arg of stmt.args)
            this.infer(arg);
          return;
        case "expr":
          this.infer(stmt.expr);
          return;
        case "return": {
          const got = stmt.value ? this.infer(stmt.value) : NIL;
          if (this.returnType)
            this.assignCheck(stmt, got, this.returnType);
          return;
        }
        case "throw":
          this.infer(stmt.value);
          return;
        case "if":
          for (const arm of stmt.arms) {
            this.infer(arm.test);
            this.inBlock(arm.body);
          }
          if (stmt.elseBody)
            this.inBlock(stmt.elseBody);
          return;
        case "while":
          this.infer(stmt.test);
          this.inBlock(stmt.body);
          return;
        case "repeat":
          this.inBlock(stmt.body);
          this.infer(stmt.test);
          return;
        case "for":
          if (stmt.iter)
            this.infer(stmt.iter);
          if (stmt.from)
            this.infer(stmt.from);
          if (stmt.to)
            this.infer(stmt.to);
          if (stmt.step)
            this.infer(stmt.step);
          this.inBlock(stmt.body, stmt.name);
          return;
        case "try":
          this.inBlock(stmt.body);
          if (stmt.catchBody)
            this.inBlock(stmt.catchBody, stmt.catchName ?? void 0);
          if (stmt.finallyBody)
            this.inBlock(stmt.finallyBody);
          return;
        default:
          return;
      }
    }
    /** A block gets its own map, so a `let` inside it does not live on after `end`. */
    inBlock(body, name) {
      const scope = /* @__PURE__ */ new Map();
      if (name)
        this.bind(scope, name, ANY);
      this.stack.push(scope);
      this.declareSurface(body, scope);
      this.walkBody(body);
      this.stack.pop();
    }
    walkFn(body, params, type) {
      const inner = /* @__PURE__ */ new Map();
      for (const param of params)
        this.bind(inner, param.name, this.fromRef(param.type));
      const saved = this.returnType;
      this.returnType = type ? this.fromRef(type) : null;
      this.stack.push(inner);
      this.declareSurface(body, inner);
      this.walkBody(body);
      this.stack.pop();
      this.returnType = saved;
    }
    walkClass(stmt) {
      const saved = this.className;
      this.className = stmt.name;
      for (const field of stmt.fields) {
        this.assignCheck(field, this.infer(field.init), this.fromRef(field.type));
      }
      for (const method of stmt.methods) {
        this.walkFn(method.body, method.params, method.type);
      }
      this.className = saved;
    }
    walkAssign(stmt) {
      const value = this.infer(stmt.value);
      if (!this.checksUses) {
        if (stmt.target.kind !== "name")
          this.infer(stmt.target);
        return;
      }
      if (stmt.target.kind === "name") {
        const bind = this.lookupBind(stmt.target.name);
        if (bind) {
          if (bind.declared.tag !== "any")
            this.assignCheck(stmt, value, bind.declared);
          else if (bind.inferred.tag !== "any" && !this.assignable(value, bind.inferred))
            bind.inferred = ANY;
          else
            bind.inferred = value;
        }
        return;
      }
      if (stmt.target.kind === "member") {
        const slot = this.memberType(stmt.target.object, stmt.target.name, stmt.target, true);
        this.assignCheck(stmt, value, slot);
        return;
      }
      this.infer(stmt.target);
    }
    infer(expr) {
      switch (expr.kind) {
        case "number":
          return NUMBER;
        case "string":
        case "template":
          if (expr.kind === "template") {
            for (const part of expr.parts) {
              if ("expr" in part)
                this.infer(part.expr);
            }
          }
          return STRING;
        case "bool":
          return BOOL;
        case "nil":
          return NIL;
        case "name":
          return this.lookup(expr.name) ?? ANY;
        case "self":
          return this.className ? { tag: "class", className: this.className } : ANY;
        case "list":
          for (const item of expr.items)
            this.infer(item);
          return LIST;
        case "record":
          for (const field of expr.fields)
            this.infer(field.value);
          return RECORD;
        case "fn":
          this.walkFn(expr.body, expr.params, expr.type);
          return this.fnType(expr.params, expr.type);
        case "unary":
          this.infer(expr.expr);
          if (expr.op === "not")
            return BOOL;
          return NUMBER;
        case "binary":
          return this.inferBinary(expr);
        case "call":
          return this.inferCall(expr);
        case "member":
          return this.memberType(expr.object, expr.name, expr, false);
        case "index":
          this.infer(expr.object);
          this.infer(expr.index);
          return ANY;
        case "new":
          return this.inferConstruct(expr.callee, expr.args, expr);
        case "super":
          for (const arg of expr.args)
            this.infer(arg);
          return ANY;
        case "await":
          this.infer(expr.expr);
          return ANY;
        default:
          return ANY;
      }
    }
    inferBinary(expr) {
      const left = this.infer(expr.left);
      const right = this.infer(expr.right);
      if (expr.op === "and" || expr.op === "or")
        return ANY;
      if (expr.op === "==" || expr.op === "!=" || expr.op === "<>" || expr.op === "<" || expr.op === ">" || expr.op === "<=" || expr.op === ">=") {
        return BOOL;
      }
      if (expr.op === "&")
        return STRING;
      if (expr.op === "+" && (left.tag === "string" || right.tag === "string"))
        return STRING;
      return NUMBER;
    }
    inferCall(expr) {
      if (expr.callee.kind === "name") {
        const info = this.classes.get(expr.callee.name);
        if (info) {
          if (this.checksUses)
            this.checkArgs(expr, expr.args, info.ctor.params ?? []);
          else
            for (const arg of expr.args)
              this.infer(arg);
          this.checkCtorAccess(info, expr);
          return { tag: "class", className: info.name };
        }
        if (this.lookupBind(expr.callee.name)?.declared === this.builtins.get(expr.callee.name)) {
          if (!this.checksUses) {
            for (const arg of expr.args)
              this.infer(arg);
            return this.builtins.get(expr.callee.name)?.returns ?? ANY;
          }
          return this.builtinCall(expr.callee.name, expr.args, expr);
        }
      }
      const callee = this.infer(expr.callee);
      if (!this.checksUses) {
        for (const arg of expr.args)
          this.infer(arg);
        return callee.returns ?? ANY;
      }
      this.checkCallable(expr, callee);
      this.checkArgs(expr, expr.args, callee.params ?? []);
      return callee.returns ?? ANY;
    }
    inferConstruct(callee, args, node) {
      if (callee.kind === "name") {
        const info = this.classes.get(callee.name);
        if (info) {
          if (this.checksUses)
            this.checkArgs(node, args, info.ctor.params ?? []);
          else
            for (const arg of args)
              this.infer(arg);
          this.checkCtorAccess(info, node);
          return { tag: "class", className: info.name };
        }
      }
      this.infer(callee);
      for (const arg of args)
        this.infer(arg);
      return ANY;
    }
    seedBuiltins(top) {
      const specs = [
        ["len", [ANY], NUMBER],
        ["str", [ANY], STRING],
        ["num", [ANY], NUMBER],
        ["int", [ANY], NUMBER],
        ["type", [ANY], STRING],
        ["keys", [ANY], LIST],
        ["values", [ANY], LIST],
        ["push", [LIST, ANY], ANY],
        ["pop", [LIST], ANY],
        ["time", [], NUMBER],
        ["error", [ANY], ANY],
        ["sleep", [NUMBER], ANY],
        ["load", [STRING], ANY]
      ];
      for (const [name, params, returns] of specs) {
        const type = { tag: "fn", params, returns };
        this.builtins.set(name, type);
        this.bind(top, name, type);
      }
    }
    builtinCall(name, args, node) {
      const spec = this.builtins.get(name);
      this.checkArgs(node, args, spec.params ?? [], name === "push" || name === "pop" ? name : null);
      return spec.returns ?? ANY;
    }
    checkCallable(node, callee) {
      if (callee.tag === "any" || callee.tag === "fn" || callee.tag === "class")
        return;
      this.oops(node, `cannot call a ${this.label(callee)}`);
    }
    checkArgs(node, args, params, listWord = null) {
      void node;
      for (let i = 0; i < args.length; i += 1) {
        const got = this.infer(args[i]);
        const want = params[i];
        if (!want)
          continue;
        if (listWord && i === 0 && !this.assignable(got, LIST) && got.tag !== "any" && got.tag !== "nil") {
          this.oops(args[i], `${listWord} expects a list`);
        }
        this.assignCheck(args[i], got, want);
      }
    }
    checkCtorAccess(info, node) {
      const ctor = info.members.get("new");
      if (!ctor)
        return;
      this.assertAccess(info, "new", ctor, node, false);
    }
    memberType(object, name, node, writing) {
      const obj = this.infer(object);
      if (obj.tag !== "class" || !obj.className)
        return ANY;
      const found = this.findMember(obj.className, name);
      if (!found)
        return ANY;
      this.assertAccess(this.classes.get(found.from), name, found.member, node, writing);
      return found.member.type;
    }
    findMember(className, name) {
      let current = className;
      const seen = /* @__PURE__ */ new Set();
      while (current && !seen.has(current)) {
        seen.add(current);
        const info = this.classes.get(current);
        if (!info)
          return null;
        const member = info.members.get(name);
        if (member)
          return { member, from: current };
        current = info.parent;
      }
      return null;
    }
    assertAccess(owner, name, member, node, _writing) {
      if (!this.checksAccess)
        return;
      if (member.access === "public")
        return;
      if (member.access === "private") {
        if (this.className === owner.name)
          return;
        this.oops(node, `${name} is private on ${owner.name}`);
      }
      if (member.access === "protected") {
        if (this.className && this.isSubclass(this.className, owner.name))
          return;
        this.oops(node, `${name} is protected on ${owner.name}`);
      }
    }
    isSubclass(child, parent) {
      let current = child;
      const seen = /* @__PURE__ */ new Set();
      while (current && !seen.has(current)) {
        if (current === parent)
          return true;
        seen.add(current);
        current = this.classes.get(current)?.parent ?? null;
      }
      return false;
    }
    assignCheck(node, got, want) {
      if (this.assignable(got, want))
        return;
      this.oops(node, `cannot assign ${this.label(got)} to ${this.label(want)}`);
    }
    assignable(got, want) {
      if (want.tag === "any" || got.tag === "any" || got.tag === "nil")
        return true;
      if (want.tag === "nil")
        return false;
      if (got.tag === want.tag) {
        if (got.tag === "class") {
          if (!want.className || !got.className)
            return true;
          return this.isSubclass(got.className, want.className);
        }
        return true;
      }
      if (got.tag === "class" && want.tag === "record")
        return true;
      if (got.tag === "fn" && want.tag === "class")
        return false;
      return false;
    }
    fromRef(ref) {
      if (!ref)
        return ANY;
      const builtin = PRIMITIVE[ref.name.toLowerCase()];
      if (builtin)
        return builtin;
      const info = this.classes.get(ref.name);
      if (info)
        return { tag: "class", className: info.name };
      return { tag: "class", className: ref.name };
    }
    fnType(params, type) {
      return {
        tag: "fn",
        params: params.map((param) => this.fromRef(param.type)),
        returns: type ? this.fromRef(type) : ANY
      };
    }
    bind(scope, name, type) {
      scope.set(name, { declared: type, inferred: type });
    }
    lookupBind(name) {
      for (let i = this.stack.length - 1; i >= 0; i -= 1) {
        const hit = this.stack[i].get(name);
        if (hit)
          return hit;
      }
      return void 0;
    }
    lookup(name) {
      const bind = this.lookupBind(name);
      if (!bind)
        return void 0;
      if (bind.declared.tag !== "any")
        return bind.declared;
      return bind.inferred;
    }
    label(type) {
      if (type.tag === "class")
        return type.className ?? "record";
      return type.tag;
    }
    oops(node, message) {
      throw new MagicError(message, node.line, node.column, this.filename);
    }
  };
  function fileAnnotations(program) {
    const list = [...program.annotations];
    for (const stmt of program.body) {
      if (stmt.annotations)
        list.push(...stmt.annotations);
    }
    return list;
  }

  // dist/optimize.js
  function foldExpr(expr) {
    switch (expr.kind) {
      case "unary": {
        const inner = foldExpr(expr.expr);
        return foldUnary(expr, inner);
      }
      case "binary": {
        const left = foldExpr(expr.left);
        const right = foldExpr(expr.right);
        return foldBinary(expr, left, right);
      }
      case "template": {
        const parts = expr.parts.map((part) => "expr" in part ? { expr: foldExpr(part.expr) } : part);
        let text = "";
        for (const part of parts) {
          if ("text" in part)
            text += part.text;
          else if (part.expr.kind === "string")
            text += part.expr.value;
          else
            return { ...expr, parts };
        }
        return { kind: "string", value: text, line: expr.line, column: expr.column };
      }
      case "list":
        return { ...expr, items: expr.items.map((item) => foldExpr(item)) };
      case "record":
        return { ...expr, fields: expr.fields.map((field) => ({ ...field, value: foldExpr(field.value) })) };
      case "call":
      case "new":
        return {
          ...expr,
          callee: foldExpr(expr.callee),
          args: expr.args.map((arg) => foldExpr(arg))
        };
      case "member":
        return { ...expr, object: foldExpr(expr.object) };
      case "index":
        return { ...expr, object: foldExpr(expr.object), index: foldExpr(expr.index) };
      case "await":
        return { ...expr, expr: foldExpr(expr.expr) };
      case "super":
        return { ...expr, args: expr.args.map((arg) => foldExpr(arg)) };
      default:
        return expr;
    }
  }
  function constantTruth(expr) {
    switch (expr.kind) {
      case "nil":
        return false;
      case "bool":
        return expr.value;
      case "number":
        return expr.value !== 0 && !Number.isNaN(expr.value);
      case "string":
        return expr.value !== "";
      case "list":
      case "record":
      case "fn":
        return true;
      default:
        return null;
    }
  }
  function foldUnary(expr, inner) {
    if (expr.op === "not") {
      const truth = constantTruth(inner);
      if (truth === null)
        return { ...expr, expr: inner };
      return { kind: "bool", value: !truth, line: expr.line, column: expr.column };
    }
    if (expr.op === "-" && inner.kind === "number")
      return numberExpr(-inner.value, expr);
    if (expr.op === "#" && inner.kind === "string")
      return numberExpr(Array.from(inner.value).length, expr);
    if (expr.op === "#" && inner.kind === "list")
      return numberExpr(inner.items.length, expr);
    if (expr.op === "#" && inner.kind === "record") {
      const keys = new Set(inner.fields.map((field) => field.name));
      return numberExpr(keys.size, expr);
    }
    return { ...expr, expr: inner };
  }
  function foldBinary(expr, left, right) {
    if (expr.op === "and" || expr.op === "or") {
      const truth = constantTruth(left);
      if (truth === null)
        return { ...expr, left, right };
      if (expr.op === "and")
        return truth ? right : left;
      return truth ? left : right;
    }
    if (expr.op === "&") {
      const text = constText(left);
      const more = constText(right);
      if (text !== null && more !== null)
        return { kind: "string", value: text + more, line: expr.line, column: expr.column };
      return { ...expr, left, right };
    }
    if (left.kind === "number" && right.kind === "number") {
      const value = numberOp(expr.op, left.value, right.value);
      if (value !== null)
        return numberExpr(value, expr);
      const compared = compareOp(expr.op, left.value, right.value);
      if (compared !== null)
        return { kind: "bool", value: compared, line: expr.line, column: expr.column };
    }
    if (expr.op === "+" && constText(left) !== null && constText(right) !== null) {
      return { kind: "string", value: `${constText(left)}${constText(right)}`, line: expr.line, column: expr.column };
    }
    if ((expr.op === "==" || expr.op === "!=" || expr.op === "<>") && bothConst(left) && bothConst(right)) {
      const same = sameConst(left, right);
      if (same !== null) {
        const yes = expr.op === "==" ? same : !same;
        return { kind: "bool", value: yes, line: expr.line, column: expr.column };
      }
    }
    if ((expr.op === "<" || expr.op === ">" || expr.op === "<=" || expr.op === ">=") && left.kind === "string" && right.kind === "string") {
      const compared = compareOp(expr.op, left.value, right.value);
      if (compared !== null)
        return { kind: "bool", value: compared, line: expr.line, column: expr.column };
    }
    return { ...expr, left, right };
  }
  function numberOp(op, left, right) {
    switch (op) {
      case "+":
        return left + right;
      case "-":
        return left - right;
      case "*":
        return left * right;
      case "/":
        return left / right;
      case "%":
        return left % right;
      case "^":
        return left ** right;
      default:
        return null;
    }
  }
  function compareOp(op, left, right) {
    switch (op) {
      case "==":
        return left === right;
      case "!=":
      case "<>":
        return left !== right;
      case "<":
        return left < right;
      case ">":
        return left > right;
      case "<=":
        return left <= right;
      case ">=":
        return left >= right;
      default:
        return null;
    }
  }
  function constText(expr) {
    if (expr.kind === "string")
      return expr.value;
    if (expr.kind === "number")
      return String(expr.value);
    if (expr.kind === "bool")
      return expr.value ? "true" : "false";
    if (expr.kind === "nil")
      return "";
    return null;
  }
  function bothConst(expr) {
    return expr.kind === "number" || expr.kind === "string" || expr.kind === "bool" || expr.kind === "nil";
  }
  function sameConst(left, right) {
    if (left.kind === "nil" && right.kind === "nil")
      return true;
    if (left.kind === "nil" || right.kind === "nil")
      return false;
    if (left.kind === "number" && right.kind === "number")
      return left.value === right.value;
    if (left.kind === "string" && right.kind === "string")
      return left.value === right.value;
    if (left.kind === "bool" && right.kind === "bool")
      return left.value === right.value;
    return null;
  }
  function numberExpr(value, at) {
    let raw;
    if (Number.isNaN(value))
      raw = "NaN";
    else if (value === Infinity)
      raw = "Infinity";
    else if (value === -Infinity)
      raw = "-Infinity";
    else
      raw = String(value);
    return { kind: "number", raw, value, line: at.line, column: at.column };
  }

  // dist/modules.js
  var CANVAS_EXPORTS = ["Canvas", "Engine", "Utilities"];
  var TERMINAL_EXPORTS = ["Terminal", "Utilities"];
  var PICTURE_EXPORTS = ["Canvas", "Terminal", "Engine", "Utilities"];
  var UI_EXPORTS = [
    "Application",
    "messageBox",
    "confirm",
    "MenuBar",
    "StatusLine",
    "borland",
    "copyTheme",
    "linux",
    "theme",
    "Desktop",
    "Group",
    "View",
    "Button",
    "CheckBox",
    "InputLine",
    "Label",
    "ListBox",
    "ProgressBar",
    "RadioGroup",
    "ScrollBar",
    "StaticText",
    "Dialog",
    "Window"
  ];
  var MODULES = {
    canvas: {
      name: "canvas",
      summary: "A bitmap, sprites, and the frame loop.",
      specifier: "magic/canvas",
      source: { kind: "file", file: "dist/modules/canvas.js" },
      exports: CANVAS_EXPORTS,
      asset: "emoji-engine-2d",
      script: "globalThis.EmojiEngine"
    },
    terminal: {
      name: "terminal",
      summary: "A cell grid for text, panels, and roguelike screens.",
      specifier: "magic/terminal",
      source: { kind: "file", file: "dist/modules/terminal.js" },
      exports: TERMINAL_EXPORTS,
      asset: "emoji-engine-2d",
      script: "globalThis.EmojiEngine"
    },
    "2d": {
      name: "2d",
      summary: "Canvas and terminal together, the whole emoji-engine-2d package.",
      specifier: "emoji-engine-2d",
      source: { kind: "package", package: "emoji-engine-2d" },
      exports: PICTURE_EXPORTS,
      asset: "emoji-engine-2d",
      script: "globalThis.EmojiEngine"
    },
    "3d": {
      name: "3d",
      summary: "A 3D scene, a camera, and billboards.",
      specifier: "emoji-engine-3d",
      source: { kind: "package", package: "emoji-engine-3d" },
      exports: PICTURE_EXPORTS,
      asset: "emoji-engine-3d",
      script: "globalThis.EmojiEngine3D"
    },
    ui: {
      name: "ui",
      summary: "Windows, buttons, and menus on a terminal.",
      specifier: "emoji-engine-ui",
      source: { kind: "package", package: "emoji-engine-ui" },
      exports: UI_EXPORTS,
      asset: "emoji-engine-ui",
      script: "globalThis.EmojiEngineUI"
    },
    sound: {
      name: "sound",
      summary: "Tones, notes, and noise.",
      specifier: "magic/sound",
      source: { kind: "file", file: "dist/modules/sound.js" },
      exports: ["Sound", "tone", "note", "noise", "play", "freq"],
      asset: "magic-stdlib",
      script: "(globalThis.MagicModules && globalThis.MagicModules.sound)"
    },
    hex: {
      name: "hex",
      summary: "Hex grids, neighbors, distance, and pixel layout.",
      specifier: "magic/hex",
      source: { kind: "file", file: "dist/modules/hex.js" },
      exports: [
        "Hex",
        "Grid",
        "hex",
        "neighbor",
        "neighbors",
        "distance",
        "ring",
        "spiral",
        "line",
        "toPixel",
        "fromPixel",
        "add",
        "round",
        "key",
        "parse",
        "DIRECTIONS"
      ],
      asset: "magic-stdlib",
      script: "(globalThis.MagicModules && globalThis.MagicModules.hex)"
    },
    games: {
      name: "games",
      summary: "Loops, keys, scenes, scores, and small bits of arithmetic.",
      specifier: "magic/games",
      source: { kind: "file", file: "dist/modules/games.js" },
      exports: [
        "clamp",
        "lerp",
        "approach",
        "choice",
        "chance",
        "range",
        "wrap",
        "Clock",
        "Keys",
        "Loop",
        "Stage",
        "Score"
      ],
      asset: "magic-stdlib",
      script: "(globalThis.MagicModules && globalThis.MagicModules.games)"
    }
  };
  var ALIASES = {
    canvas: "canvas",
    terminal: "terminal",
    "2d": "2d",
    "emoji-engine-2d": "2d",
    "3d": "3d",
    "emoji-engine-3d": "3d",
    ui: "ui",
    "emoji-engine-ui": "ui",
    sound: "sound",
    hex: "hex",
    games: "games"
  };
  function moduleKey(specifier) {
    return ALIASES[specifier] ?? null;
  }
  function moduleBySpecifier(specifier) {
    const key = moduleKey(specifier);
    return key ? MODULES[key] : null;
  }
  function moduleNs(name) {
    return `__magic_mod_${name.replace(/[^A-Za-z0-9_]/g, "_")}`;
  }
  function missingExport(moduleName, imported) {
    const homes = [];
    for (const mod of Object.values(MODULES)) {
      if (mod.exports.includes(imported))
        homes.push(mod.name);
    }
    const tail = homes.length > 0 ? ` ${imported} is exported by ${homes.join(", ")}.` : "";
    return `${moduleName} has no ${imported}.${tail}`;
  }
  var JS_EXT = /\.(js|mjs|cjs|json)$/i;
  function isMagicSpecifier(specifier) {
    if (moduleKey(specifier))
      return false;
    if (specifier.endsWith(".magic"))
      return true;
    if (specifier.startsWith("./") || specifier.startsWith("../")) {
      if (JS_EXT.test(specifier))
        return false;
      return true;
    }
    return false;
  }
  function isJsSpecifier(specifier) {
    if (moduleKey(specifier))
      return false;
    return JS_EXT.test(specifier);
  }

  // dist/lexer.js
  var KEYWORDS = /* @__PURE__ */ new Set([
    "import",
    "from",
    "class",
    "fn",
    "end",
    "if",
    "then",
    "else",
    "elseif",
    "for",
    "while",
    "repeat",
    "until",
    "return",
    "break",
    "continue",
    "let",
    "print",
    "and",
    "or",
    "not",
    "true",
    "false",
    "nil",
    "new",
    "self",
    "super",
    "try",
    "catch",
    "finally",
    "throw",
    "await",
    "use"
  ]);
  var Lexer = class {
    source;
    filename;
    i = 0;
    line = 1;
    column = 1;
    atLineStart = true;
    constructor(source, filename = "", line = 1, column = 1) {
      this.source = source.charCodeAt(0) === 65279 ? source.slice(1) : source;
      this.filename = filename;
      this.line = line;
      this.column = column;
    }
    tokenize() {
      const tokens = [];
      while (!this.done()) {
        this.skipSpaces();
        if (this.done())
          break;
        if (this.atLineStart && this.startsRemark()) {
          this.skipRemark();
          continue;
        }
        if (this.match("-", "-")) {
          this.skipToLineEnd();
          continue;
        }
        const token = this.one();
        if (!token)
          continue;
        tokens.push(token);
        this.atLineStart = token.kind === "newline";
      }
      tokens.push({ kind: "eof", value: "", line: this.line, column: this.column });
      return tokens;
    }
    one() {
      const line = this.line;
      const column = this.column;
      const ch = this.code();
      if (ch === 10 || ch === 13) {
        this.newline();
        return { kind: "newline", value: "\n", line, column };
      }
      if (ch === 36 && (this.source[this.i + 1] === '"' || this.source[this.i + 1] === "'")) {
        return this.template(line, column);
      }
      if (ch === 34 && this.atTriple())
        return this.longString(line, column);
      if (ch === 34 || ch === 39)
        return this.string(line, column);
      if (this.isDigit(ch) || ch === 46 && this.isDigit(this.codeAt(1)))
        return this.number(line, column);
      if (this.isIdentStart(ch))
        return this.ident(line, column);
      const op = this.operator();
      if (op)
        return { kind: "op", value: op, line, column };
      throw this.fail(line, column, `unexpected character ${JSON.stringify(this.char())}`);
    }
    string(line, column) {
      const quote = this.char();
      this.bump();
      let value = "";
      while (!this.done()) {
        const ch = this.char();
        if (ch === quote) {
          this.bump();
          return { kind: "string", value, line, column };
        }
        if (ch === "\n" || ch === "\r") {
          throw this.fail(this.line, this.column, "a string has to end on the same line");
        }
        if (ch === "\\") {
          value += this.escape(line, column);
          continue;
        }
        value += this.bump();
      }
      throw this.fail(line, column, "this string never ends");
    }
    /** `"""` may span lines. A newline right after the opening quotes is dropped. */
    longString(line, column) {
      this.bump();
      this.bump();
      this.bump();
      this.dropLeadingBreak();
      let value = "";
      while (!this.done()) {
        if (this.atTriple()) {
          this.bump();
          this.bump();
          this.bump();
          return { kind: "string", value, line, column };
        }
        if (this.code() === 10 || this.code() === 13) {
          value += "\n";
          this.newline();
          continue;
        }
        if (this.char() === "\\") {
          value += this.escape(line, column);
          continue;
        }
        value += this.bump();
      }
      throw this.fail(line, column, "this string never ends");
    }
    /**
     * `$"..."` and `$"""..."""`. `{expr}` is a hole. `{{` and `}}` are braces.
     * The parser reads each hole as an expression.
     */
    template(line, column) {
      this.bump();
      const triple = this.atTriple();
      const quote = this.char();
      if (triple) {
        this.bump();
        this.bump();
        this.bump();
        this.dropLeadingBreak();
      } else {
        this.bump();
      }
      const parts = [];
      let text = "";
      const pushText = () => {
        if (text === "")
          return;
        parts.push({ kind: "text", value: text });
        text = "";
      };
      while (!this.done()) {
        if (triple ? this.atTriple() : this.char() === quote) {
          if (triple) {
            this.bump();
            this.bump();
            this.bump();
          } else
            this.bump();
          pushText();
          return { kind: "template", value: "", parts, line, column };
        }
        if (!triple && (this.code() === 10 || this.code() === 13)) {
          throw this.fail(this.line, this.column, "a string has to end on the same line");
        }
        if (this.char() === "{" && this.source[this.i + 1] === "{") {
          text += "{";
          this.bump();
          this.bump();
          continue;
        }
        if (this.char() === "}" && this.source[this.i + 1] === "}") {
          text += "}";
          this.bump();
          this.bump();
          continue;
        }
        if (this.char() === "{") {
          pushText();
          parts.push(this.hole());
          continue;
        }
        if (this.code() === 10 || this.code() === 13) {
          text += "\n";
          this.newline();
          continue;
        }
        if (this.char() === "\\") {
          text += this.escape(line, column);
          continue;
        }
        text += this.bump();
      }
      throw this.fail(line, column, "this string never ends");
    }
    hole() {
      const line = this.line;
      const column = this.column;
      this.bump();
      const start = this.i;
      const startLine = this.line;
      const startColumn = this.column;
      let depth = 1;
      while (!this.done() && depth > 0) {
        const ch = this.char();
        if (ch === '"' || ch === "'") {
          this.skipQuoted();
          continue;
        }
        if (ch === "{") {
          depth += 1;
          this.bump();
          continue;
        }
        if (ch === "}") {
          depth -= 1;
          if (depth === 0)
            break;
          this.bump();
          continue;
        }
        if (this.code() === 10 || this.code() === 13) {
          this.newline();
          continue;
        }
        this.bump();
      }
      if (depth !== 0)
        throw this.fail(line, column, "this interpolation never ends");
      const source = this.source.slice(start, this.i);
      this.bump();
      if (source.trim() === "")
        throw this.fail(line, column, "this interpolation is empty");
      return { kind: "hole", source, line: startLine, column: startColumn };
    }
    /** Skip a string inside an interpolation so its braces stay part of the text. */
    skipQuoted() {
      if (this.atTriple()) {
        const line2 = this.line;
        const column2 = this.column;
        this.bump();
        this.bump();
        this.bump();
        while (!this.done()) {
          if (this.atTriple()) {
            this.bump();
            this.bump();
            this.bump();
            return;
          }
          if (this.char() === "\\") {
            this.bump();
            if (!this.done())
              this.bump();
            continue;
          }
          if (this.code() === 10 || this.code() === 13) {
            this.newline();
            continue;
          }
          this.bump();
        }
        throw this.fail(line2, column2, "this string never ends");
      }
      const quote = this.char();
      const line = this.line;
      const column = this.column;
      this.bump();
      while (!this.done()) {
        if (this.char() === quote) {
          this.bump();
          return;
        }
        if (this.code() === 10 || this.code() === 13) {
          throw this.fail(this.line, this.column, "a string has to end on the same line");
        }
        if (this.char() === "\\") {
          this.bump();
          if (!this.done())
            this.bump();
          continue;
        }
        this.bump();
      }
      throw this.fail(line, column, "this string never ends");
    }
    atTriple() {
      return this.char() === '"' && this.source[this.i + 1] === '"' && this.source[this.i + 2] === '"';
    }
    dropLeadingBreak() {
      if (this.code() === 10 || this.code() === 13)
        this.newline();
    }
    escape(line, column) {
      this.bump();
      if (this.done())
        throw this.fail(line, column, "this string never ends");
      const ch = this.bump();
      switch (ch) {
        case "n":
          return "\n";
        case "r":
          return "\r";
        case "t":
          return "	";
        case "0":
          return "\0";
        case "\\":
        case "'":
        case '"':
          return ch;
        case "u":
          return this.unicode(line, column);
        default:
          throw this.fail(this.line, this.column, `unknown escape \\${ch}`);
      }
    }
    unicode(line, column) {
      if (this.char() === "{") {
        this.bump();
        let hex2 = "";
        while (this.isHex(this.code()) && hex2.length < 6)
          hex2 += this.bump();
        if (this.char() !== "}" || hex2.length === 0) {
          throw this.fail(line, column, "a \\u{...} escape needs hex digits and a closing brace");
        }
        this.bump();
        const code = Number.parseInt(hex2, 16);
        if (code > 1114111)
          throw this.fail(line, column, "that code point is too big");
        return String.fromCodePoint(code);
      }
      let hex = "";
      for (let n = 0; n < 4; n += 1) {
        if (!this.isHex(this.code()))
          throw this.fail(line, column, "a \\u escape needs four hex digits");
        hex += this.bump();
      }
      return String.fromCodePoint(Number.parseInt(hex, 16));
    }
    number(line, column) {
      const start = this.i;
      if (this.char() === ".")
        this.bump();
      while (this.isDigit(this.code()))
        this.bump();
      if (this.char() === "." && this.isDigit(this.codeAt(1))) {
        this.bump();
        while (this.isDigit(this.code()))
          this.bump();
      }
      if (this.char() === "e" || this.char() === "E") {
        const mark = this.i;
        const markColumn = this.column;
        this.bump();
        if (this.char() === "+" || this.char() === "-")
          this.bump();
        if (!this.isDigit(this.code())) {
          this.i = mark;
          this.column = markColumn;
        } else {
          while (this.isDigit(this.code()))
            this.bump();
        }
      }
      const raw = this.source.slice(start, this.i);
      if (/^0\d/.test(raw)) {
        throw this.fail(line, column, `write ${Number(raw)} instead of ${raw}`);
      }
      return { kind: "number", value: raw, line, column };
    }
    ident(line, column) {
      let value = "";
      while (this.isIdentPart(this.code()))
        value += this.bump();
      const word = value.toLowerCase();
      if (KEYWORDS.has(word))
        return { kind: "keyword", value: word, line, column };
      return { kind: "ident", value, line, column };
    }
    operator() {
      const two = this.source.slice(this.i, this.i + 2);
      const pairs = ["==", "!=", "<>", "<=", ">=", "+=", "-=", "*=", "/=", ".."];
      if (pairs.includes(two)) {
        this.bump();
        this.bump();
        return two;
      }
      const one = this.char();
      if ("+-*/%^=<>()[]{},.:;&|#@".includes(one)) {
        this.bump();
        return one;
      }
      return null;
    }
    startsRemark() {
      if (this.code() !== 82 && this.code() !== 114)
        return false;
      const rest = this.source.slice(this.i, this.i + 3).toLowerCase();
      if (rest !== "rem")
        return false;
      const after = this.codeAt(3);
      return !this.isIdentPart(after);
    }
    skipRemark() {
      this.skipToLineEnd();
      if (!this.done())
        this.newline();
      this.atLineStart = true;
    }
    skipToLineEnd() {
      while (!this.done() && this.code() !== 10 && this.code() !== 13)
        this.bump();
    }
    skipSpaces() {
      while (!this.done()) {
        const ch = this.code();
        if (ch === 32 || ch === 9 || ch === 12 || ch === 11) {
          this.bump();
          continue;
        }
        break;
      }
    }
    newline() {
      if (this.code() === 13 && this.codeAt(1) === 10)
        this.i += 2;
      else
        this.i += 1;
      this.line += 1;
      this.column = 1;
    }
    match(a, b) {
      return this.char() === a && this.source[this.i + a.length] === b;
    }
    bump() {
      const cp = this.source.codePointAt(this.i) ?? 0;
      const size = cp > 65535 ? 2 : 1;
      const ch = this.source.slice(this.i, this.i + size);
      this.i += size;
      this.column += 1;
      return ch;
    }
    char() {
      return this.source[this.i] ?? "";
    }
    code() {
      return this.source.codePointAt(this.i) ?? 0;
    }
    codeAt(offset) {
      return this.source.codePointAt(this.i + offset) ?? 0;
    }
    done() {
      return this.i >= this.source.length;
    }
    isDigit(code) {
      return code >= 48 && code <= 57;
    }
    isHex(code) {
      return this.isDigit(code) || code >= 65 && code <= 70 || code >= 97 && code <= 102;
    }
    isIdentStart(code) {
      return code >= 65 && code <= 90 || code >= 97 && code <= 122 || code === 95;
    }
    isIdentPart(code) {
      return this.isIdentStart(code) || this.isDigit(code);
    }
    fail(line, column, message) {
      return new MagicError(message, line, column, this.filename);
    }
  };

  // dist/lower.js
  function lowerModules(program) {
    const loads = [];
    const seen = /* @__PURE__ */ new Set();
    const bound = /* @__PURE__ */ new Map();
    for (const stmt of program.body) {
      if (stmt.kind !== "import")
        continue;
      if (stmt.form === "namespace" && stmt.alias)
        bound.set(stmt.alias, stmt.specifier);
      for (const name of stmt.names)
        bound.set(name.local, stmt.specifier);
    }
    const claim = (local, from, ann, mod) => {
      const prev = bound.get(local);
      if (!prev) {
        bound.set(local, from);
        return true;
      }
      if (labelModule(prev) === mod && labelModule(from) === mod)
        return false;
      const hint = from.startsWith("@") ? ` Use ${from} as a name` : "";
      throw new MagicError(`${local} comes from both ${prev} and ${from}.${hint}`, ann.line, ann.column, program.filename);
    };
    const addLoad = (ann, mod) => {
      const info = MODULES[mod];
      if (ann.alias) {
        const mark2 = `ns:${mod}:${ann.alias}`;
        if (seen.has(mark2))
          return;
        seen.add(mark2);
        if (!claim(ann.alias, `@${mod}`, ann, mod))
          return;
        loads.push({
          kind: "import",
          form: "namespace",
          specifier: info.name,
          alias: ann.alias,
          names: [],
          line: ann.line,
          column: ann.column
        });
        return;
      }
      const mark = `all:${mod}`;
      if (seen.has(mark))
        return;
      seen.add(mark);
      const names = [];
      for (const imported of info.exports) {
        if (!claim(imported, `@${mod}`, ann, mod))
          continue;
        names.push({ imported, local: imported });
      }
      if (names.length === 0)
        return;
      loads.push({
        kind: "import",
        form: "named",
        specifier: info.name,
        alias: null,
        names,
        line: ann.line,
        column: ann.column
      });
    };
    const kept = (list, top) => {
      if (!list || list.length === 0)
        return [];
      const keep = [];
      for (const ann of list) {
        const mod = moduleKey(ann.name);
        if (!mod) {
          keep.push(ann);
          continue;
        }
        if (!top) {
          throw new MagicError("a module annotation belongs at the top of the script", ann.line, ann.column, program.filename);
        }
        if (ann.called || ann.args.length > 0) {
          throw new MagicError(`a module annotation does not take arguments. Write @${mod}`, ann.line, ann.column, program.filename);
        }
        addLoad(ann, mod);
      }
      return keep;
    };
    const store = (node, top) => {
      const next = kept(node.annotations, top);
      if (next.length > 0)
        node.annotations = next;
      else
        delete node.annotations;
    };
    program.annotations = kept(program.annotations, true);
    for (const stmt of program.body) {
      store(stmt, true);
      walkInside(stmt, (node) => store(node, false));
    }
    if (loads.length > 0)
      program.body = [...loads, ...program.body];
    expandStandardUses(program, claim);
    return program;
  }
  function expandStandardUses(program, claim) {
    program.body = program.body.filter((stmt) => {
      if (stmt.kind !== "import" || stmt.form !== "star")
        return true;
      const info = moduleBySpecifier(stmt.specifier);
      if (!info)
        return true;
      const ann = {
        name: info.name,
        args: [],
        called: false,
        alias: null,
        line: stmt.line,
        column: stmt.column
      };
      const names = [];
      for (const imported of info.exports) {
        if (!claim(imported, info.name, ann, info.name))
          continue;
        names.push({ imported, local: imported });
      }
      if (names.length === 0)
        return false;
      stmt.form = "named";
      stmt.names = names;
      stmt.specifier = info.name;
      return true;
    });
  }
  function labelModule(label) {
    const bare = label.startsWith("@") ? label.slice(1) : label;
    return moduleKey(bare);
  }
  function walkInside(stmt, visit) {
    switch (stmt.kind) {
      case "fn":
        for (const inner of stmt.body)
          walkStmt(inner, visit);
        return;
      case "class":
        for (const field of stmt.fields) {
          visit(field);
          walkExpr(field.init, visit);
        }
        for (const method of stmt.methods) {
          visit(method);
          for (const inner of method.body)
            walkStmt(inner, visit);
        }
        return;
      case "if":
        for (const arm of stmt.arms) {
          walkExpr(arm.test, visit);
          for (const inner of arm.body)
            walkStmt(inner, visit);
        }
        if (stmt.elseBody) {
          for (const inner of stmt.elseBody)
            walkStmt(inner, visit);
        }
        return;
      case "while":
        walkExpr(stmt.test, visit);
        for (const inner of stmt.body)
          walkStmt(inner, visit);
        return;
      case "repeat":
        for (const inner of stmt.body)
          walkStmt(inner, visit);
        walkExpr(stmt.test, visit);
        return;
      case "for":
        if (stmt.from)
          walkExpr(stmt.from, visit);
        if (stmt.to)
          walkExpr(stmt.to, visit);
        if (stmt.step)
          walkExpr(stmt.step, visit);
        if (stmt.iter)
          walkExpr(stmt.iter, visit);
        for (const inner of stmt.body)
          walkStmt(inner, visit);
        return;
      case "try":
        for (const inner of stmt.body)
          walkStmt(inner, visit);
        if (stmt.catchBody) {
          for (const inner of stmt.catchBody)
            walkStmt(inner, visit);
        }
        if (stmt.finallyBody) {
          for (const inner of stmt.finallyBody)
            walkStmt(inner, visit);
        }
        return;
      case "let":
        if (stmt.init)
          walkExpr(stmt.init, visit);
        return;
      case "assign":
        walkExpr(stmt.target, visit);
        walkExpr(stmt.value, visit);
        return;
      case "expr":
        walkExpr(stmt.expr, visit);
        return;
      case "print":
        for (const arg of stmt.args)
          walkExpr(arg, visit);
        return;
      case "return":
        if (stmt.value)
          walkExpr(stmt.value, visit);
        return;
      case "throw":
        walkExpr(stmt.value, visit);
        return;
      default:
        return;
    }
  }
  function walkStmt(stmt, visit) {
    visit(stmt);
    walkInside(stmt, visit);
  }
  function walkExpr(expr, visit) {
    switch (expr.kind) {
      case "fn":
        for (const inner of expr.body)
          walkStmt(inner, visit);
        return;
      case "list":
        for (const item of expr.items)
          walkExpr(item, visit);
        return;
      case "record":
        for (const field of expr.fields)
          walkExpr(field.value, visit);
        return;
      case "unary":
      case "await":
        walkExpr(expr.expr, visit);
        return;
      case "binary":
        walkExpr(expr.left, visit);
        walkExpr(expr.right, visit);
        return;
      case "call":
      case "new":
        walkExpr(expr.callee, visit);
        for (const arg of expr.args)
          walkExpr(arg, visit);
        return;
      case "member":
        walkExpr(expr.object, visit);
        return;
      case "index":
        walkExpr(expr.object, visit);
        walkExpr(expr.index, visit);
        return;
      case "super":
        for (const arg of expr.args)
          walkExpr(arg, visit);
        return;
      case "template":
        for (const part of expr.parts) {
          if ("expr" in part)
            walkExpr(part.expr, visit);
        }
        return;
      default:
        return;
    }
  }

  // dist/parser.js
  var JS_RESERVED = /* @__PURE__ */ new Set([
    "await",
    "arguments",
    "break",
    "case",
    "catch",
    "class",
    "const",
    "continue",
    "debugger",
    "default",
    "delete",
    "do",
    "else",
    "enum",
    "eval",
    "export",
    "extends",
    "false",
    "finally",
    "for",
    "function",
    "if",
    "implements",
    "import",
    "in",
    "instanceof",
    "interface",
    "let",
    "new",
    "null",
    "package",
    "private",
    "protected",
    "public",
    "return",
    "static",
    "super",
    "switch",
    "this",
    "throw",
    "true",
    "try",
    "typeof",
    "undefined",
    "var",
    "void",
    "while",
    "with",
    "yield"
  ]);
  var ASSIGN = {
    "=": "=",
    "+=": "+=",
    "-=": "-=",
    "*=": "*=",
    "/=": "/="
  };
  var Parser = class _Parser {
    tokens = [];
    i = 0;
    filename;
    trailingAnnotations = [];
    constructor(filename = "") {
      this.filename = filename;
    }
    parse(source) {
      this.tokens = new Lexer(source, this.filename).tokenize();
      this.i = 0;
      this.trailingAnnotations = [];
      const body = this.statements(/* @__PURE__ */ new Set(["eof"]));
      return lowerModules({
        kind: "program",
        body,
        line: 1,
        column: 1,
        filename: this.filename,
        annotations: this.trailingAnnotations
      });
    }
    statements(stop) {
      const body = [];
      for (; ; ) {
        this.skipNl();
        const token = this.peek();
        if (token.kind === "eof") {
          if (!stop.has("eof"))
            this.fail(token, `expected ${this.stopText(stop)}`);
          break;
        }
        if (token.kind === "keyword" && stop.has(token.value))
          break;
        const annotations = this.takeAnnotations();
        this.skipNl();
        const next = this.peek();
        if (next.kind === "eof" || next.kind === "keyword" && stop.has(next.value)) {
          if (next.kind === "eof") {
            if (!stop.has("eof"))
              this.fail(next, `expected ${this.stopText(stop)}`);
            this.trailingAnnotations = annotations;
            break;
          }
          if (annotations.length)
            this.fail(annotations[0], "this annotation needs a statement");
          break;
        }
        body.push(this.statement(annotations));
        this.finish(stop);
      }
      return body;
    }
    statement(annotations = []) {
      const token = this.peek();
      if (token.kind === "keyword") {
        switch (token.value) {
          case "import":
            return this.tag(this.importStmt(), annotations);
          case "use":
            return this.tag(this.useStmt(), annotations);
          case "fn":
            return this.tag(this.fnStmt(false), annotations);
          case "class":
            return this.tag(this.classStmt(), annotations);
          case "if":
            return this.tag(this.ifStmt(), annotations);
          case "while":
            return this.tag(this.whileStmt(), annotations);
          case "for":
            return this.tag(this.forStmt(), annotations);
          case "repeat":
            return this.tag(this.repeatStmt(), annotations);
          case "return":
            return this.tag(this.returnStmt(), annotations);
          case "break":
            this.next();
            return this.tag({ kind: "break", ...this.at(token) }, annotations);
          case "continue":
            this.next();
            return this.tag({ kind: "continue", ...this.at(token) }, annotations);
          case "let":
            return this.tag(this.letStmt(), annotations);
          case "print":
            return this.tag(this.printStmt(), annotations);
          case "try":
            return this.tag(this.tryStmt(), annotations);
          case "throw":
            return this.tag(this.throwStmt(), annotations);
          case "end":
          case "else":
          case "elseif":
          case "until":
          case "then":
          case "from":
          case "catch":
          case "finally":
            this.fail(token, `unexpected ${token.value}`);
            break;
          default:
            break;
        }
      }
      if (this.startsAsyncFn()) {
        this.next();
        this.skipNl();
        return this.tag(this.fnStmt(true), annotations);
      }
      return this.tag(this.assignOrCall(), annotations);
    }
    importStmt() {
      const start = this.next();
      if (this.peek().kind === "string") {
        const specifier2 = this.next().value;
        if (this.eatWord("as")) {
          const alias = this.expectIdent();
          return { kind: "import", form: "namespace", specifier: specifier2, alias, names: [], ...this.at(start) };
        }
        return { kind: "import", form: "side", specifier: specifier2, alias: null, names: [], ...this.at(start) };
      }
      const names = [];
      do {
        const imported = this.expectImportedName();
        const local = this.eatWord("as") ? this.expectIdent() : this.asLocalName(imported);
        names.push({ imported, local });
      } while (this.eatOp(","));
      this.expectKeyword("from");
      const specifier = this.expectKind("string", "expected a module name in quotes").value;
      return { kind: "import", form: "named", specifier, alias: null, names, ...this.at(start) };
    }
    /** `use "canvas"` and `use "./words"`. `as` keeps the module under one name. */
    useStmt() {
      const start = this.next();
      const specifier = this.expectKind("string", "expected a module name in quotes").value;
      if (this.eatWord("as")) {
        const alias = this.expectIdent();
        return { kind: "import", form: "namespace", specifier, alias, names: [], via: "use", ...this.at(start) };
      }
      return { kind: "import", form: "star", specifier, alias: null, names: [], via: "use", ...this.at(start) };
    }
    fnStmt(async) {
      const start = this.next();
      if (this.peek().kind !== "ident") {
        this.fail(this.peek(), "this function needs a name. Use fn name(), or fn() inside an expression");
      }
      const name = this.expectIdent();
      const params = this.params();
      const type = this.parseAsType();
      const body = this.statements(/* @__PURE__ */ new Set(["end"]));
      this.expectKeyword("end");
      return { kind: "fn", name, params, body, async, type, ...this.at(start) };
    }
    classStmt() {
      const start = this.next();
      const name = this.expectIdent();
      const parent = this.eatWord("is") ? this.expectIdent() : null;
      const fields = [];
      const methods = [];
      const used = /* @__PURE__ */ new Set();
      for (; ; ) {
        this.skipNl();
        const token = this.peek();
        if (token.kind === "eof")
          this.fail(token, `expected end to close class ${name}`);
        if (token.kind === "keyword" && token.value === "end")
          break;
        const annotations = this.takeAnnotations();
        this.skipNl();
        if (this.peek().kind === "keyword" && this.peek().value === "end") {
          if (annotations.length)
            this.fail(annotations[0], "this annotation needs a statement");
          break;
        }
        const access = this.accessWord();
        const memberStart = this.peek();
        const asyncMethod = this.startsAsyncFn();
        if (asyncMethod || memberStart.kind === "keyword" && memberStart.value === "fn") {
          if (asyncMethod) {
            this.next();
            this.skipNl();
          }
          const method = this.method(asyncMethod);
          this.tag(method, annotations);
          method.access = this.mergeAccess(access, annotations, method);
          if (used.has(method.name))
            this.fail(method, `${method.name} is already in class ${name}`);
          used.add(method.name);
          methods.push(method);
          continue;
        }
        if (memberStart.kind === "keyword" && memberStart.value === "let")
          this.next();
        if (this.peek().kind !== "ident")
          this.fail(this.peek(), "a class holds fields and fn methods");
        const fieldToken = this.peek();
        const fieldName = this.expectIdent();
        if (fieldName === "new")
          this.fail(fieldToken, "new is the constructor. Write fn new()");
        if (used.has(fieldName))
          this.fail(fieldToken, `${fieldName} is already in class ${name}`);
        used.add(fieldName);
        const fieldType = this.parseAsType();
        if (!this.eatOp("="))
          this.fail(this.peek(), `field ${fieldName} needs = and a value`);
        this.skipNl();
        const init = this.expression();
        const field = {
          name: fieldName,
          init,
          access: null,
          type: fieldType,
          ...this.at(fieldToken)
        };
        this.tag(field, annotations);
        field.access = this.mergeAccess(access, annotations, field);
        fields.push(field);
        this.finish(/* @__PURE__ */ new Set(["end"]));
      }
      this.expectKeyword("end");
      return { kind: "class", name, parent, fields, methods, ...this.at(start) };
    }
    method(async) {
      const start = this.next();
      const name = this.methodName();
      if (async && name === "new")
        this.fail(start, "fn new cannot be async");
      const params = this.params();
      const type = this.parseAsType();
      const body = this.statements(/* @__PURE__ */ new Set(["end"]));
      this.expectKeyword("end");
      return { name, params, body, async, access: null, type, ...this.at(start) };
    }
    ifStmt() {
      const start = this.next();
      const arms = [];
      const first = this.condition();
      this.eatWord("then");
      arms.push({ test: first, body: this.statements(/* @__PURE__ */ new Set(["end", "else", "elseif"])), ...this.at(start) });
      for (; ; ) {
        if (this.peek().kind === "keyword" && this.peek().value === "elseif") {
          const mark = this.next();
          const test = this.condition();
          this.eatWord("then");
          arms.push({ test, body: this.statements(/* @__PURE__ */ new Set(["end", "else", "elseif"])), ...this.at(mark) });
          continue;
        }
        if (this.peek().kind === "keyword" && this.peek().value === "else") {
          const elseToken = this.peek();
          const next = this.peek(1);
          if (next.kind === "keyword" && next.value === "if" && next.line === elseToken.line) {
            this.next();
            const mark = this.next();
            const test = this.condition();
            this.eatWord("then");
            arms.push({ test, body: this.statements(/* @__PURE__ */ new Set(["end", "else", "elseif"])), ...this.at(mark) });
            continue;
          }
          this.next();
          const elseBody = this.statements(/* @__PURE__ */ new Set(["end"]));
          this.expectKeyword("end");
          return { kind: "if", arms, elseBody, ...this.at(start) };
        }
        break;
      }
      this.expectKeyword("end");
      return { kind: "if", arms, elseBody: null, ...this.at(start) };
    }
    whileStmt() {
      const start = this.next();
      const test = this.condition();
      this.eatWord("do");
      const body = this.statements(/* @__PURE__ */ new Set(["end"]));
      this.expectKeyword("end");
      return { kind: "while", test, body, ...this.at(start) };
    }
    forStmt() {
      const start = this.next();
      const name = this.expectIdent();
      if (this.eatOp("=")) {
        const from = this.expression();
        if (!this.eatWord("to"))
          this.fail(this.peek(), "for i = start to stop");
        const to = this.expression();
        const step = this.eatWord("step") ? this.expression() : null;
        this.eatWord("do");
        const body = this.statements(/* @__PURE__ */ new Set(["end"]));
        this.expectKeyword("end");
        return { kind: "for", name, from, to, step, iter: null, body, ...this.at(start) };
      }
      if (this.eatWord("in")) {
        const iter = this.expression();
        this.eatWord("do");
        const body = this.statements(/* @__PURE__ */ new Set(["end"]));
        this.expectKeyword("end");
        return { kind: "for", name, from: null, to: null, step: null, iter, body, ...this.at(start) };
      }
      this.fail(this.peek(), "for i = start to stop, or for item in list");
    }
    repeatStmt() {
      const start = this.next();
      const body = this.statements(/* @__PURE__ */ new Set(["until"]));
      this.expectKeyword("until");
      const test = this.condition();
      return { kind: "repeat", body, test, ...this.at(start) };
    }
    returnStmt() {
      const start = this.next();
      if (this.closes())
        return { kind: "return", value: null, ...this.at(start) };
      return { kind: "return", value: this.expression(), ...this.at(start) };
    }
    letStmt() {
      const start = this.next();
      const name = this.expectIdent();
      const type = this.parseAsType();
      if (!this.eatOp("="))
        return { kind: "let", name, init: null, type, ...this.at(start) };
      this.skipNl();
      return { kind: "let", name, init: this.expression(), type, ...this.at(start) };
    }
    printStmt() {
      const start = this.next();
      if (this.closes())
        return { kind: "print", args: [], ...this.at(start) };
      const args = [this.expression()];
      while (this.eatOp(",")) {
        this.skipNl();
        args.push(this.expression());
      }
      return { kind: "print", args, ...this.at(start) };
    }
    tryStmt() {
      const start = this.next();
      const body = this.statements(/* @__PURE__ */ new Set(["end", "catch", "finally"]));
      let catchName = null;
      let catchBody = null;
      let finallyBody = null;
      if (this.peek().kind === "keyword" && this.peek().value === "catch") {
        const mark = this.next();
        if (this.peek().kind === "ident" && this.peek().line === mark.line) {
          catchName = this.expectIdent();
        }
        catchBody = this.statements(/* @__PURE__ */ new Set(["end", "finally"]));
      }
      if (this.peek().kind === "keyword" && this.peek().value === "finally") {
        this.next();
        finallyBody = this.statements(/* @__PURE__ */ new Set(["end"]));
      }
      if (!catchBody && !finallyBody)
        this.fail(start, "try needs catch or finally");
      this.expectKeyword("end");
      return { kind: "try", body, catchName, catchBody, finallyBody, ...this.at(start) };
    }
    throwStmt() {
      const start = this.next();
      this.skipNl();
      if (this.closes())
        this.fail(start, "throw needs a value");
      return { kind: "throw", value: this.expression(), ...this.at(start) };
    }
    assignOrCall() {
      const start = this.peek();
      const expr = this.expression();
      const op = this.peek();
      if (op.kind === "op" && ASSIGN[op.value]) {
        this.next();
        if (!this.isTarget(expr))
          this.fail(start, "this cannot be assigned to");
        this.skipNl();
        const value = this.expression();
        return { kind: "assign", target: expr, op: ASSIGN[op.value], value, ...this.at(start) };
      }
      if (expr.kind !== "call" && expr.kind !== "super" && expr.kind !== "await") {
        this.fail(start, "this value is unused. Call a function, or assign with =");
      }
      return { kind: "expr", expr, ...this.at(start) };
    }
    condition() {
      const expr = this.expression();
      const next = this.peek();
      if (next.kind === "op" && next.value === "=") {
        this.fail(next, "use == to compare. = assigns a value");
      }
      return expr;
    }
    expression(min = 0) {
      let left = this.unary();
      for (; ; ) {
        const op = this.binaryOp(this.peek());
        if (!op || op.prec < min)
          break;
        this.next();
        this.skipNl();
        const nextMin = op.right ? op.prec : op.prec + 1;
        const right = this.expression(nextMin);
        left = { kind: "binary", op: op.op, left, right, line: left.line, column: left.column };
      }
      return left;
    }
    unary() {
      const token = this.peek();
      if (token.kind === "keyword" && token.value === "not") {
        this.next();
        this.skipNl();
        return { kind: "unary", op: "not", expr: this.expression(3), ...this.at(token) };
      }
      if (token.kind === "keyword" && token.value === "await") {
        this.next();
        this.skipNl();
        return { kind: "await", expr: this.expression(8), ...this.at(token) };
      }
      if (token.kind === "keyword" && token.value === "new")
        return this.newExpr();
      if (token.kind === "op" && token.value === "-") {
        this.next();
        this.skipNl();
        return { kind: "unary", op: "-", expr: this.expression(8), ...this.at(token) };
      }
      if (token.kind === "op" && token.value === "#") {
        this.next();
        this.skipNl();
        return { kind: "unary", op: "#", expr: this.expression(8), ...this.at(token) };
      }
      return this.postfix();
    }
    newExpr() {
      const start = this.next();
      let callee = this.primary();
      callee = this.memberChain(callee);
      if (!this.eatOp("("))
        this.fail(this.peek(), "new needs a call, like new Engine({})");
      const args = this.argList();
      this.expectOp(")");
      let expr = { kind: "new", callee, args, ...this.at(start) };
      expr = this.memberChain(expr);
      while (this.peek().kind === "op" && this.peek().value === "(") {
        expr = this.callAfter(expr);
      }
      return expr;
    }
    postfix() {
      let expr = this.primary();
      for (; ; ) {
        if (this.peek().kind === "op" && this.peek().value === "(") {
          expr = this.callAfter(expr);
          continue;
        }
        if ((this.peek().kind === "string" || this.peek().kind === "template") && (expr.kind === "name" || expr.kind === "member")) {
          const text = this.next();
          const arg = text.kind === "template" ? this.templateExpr(text) : { kind: "string", value: text.value, ...this.at(text) };
          expr = { kind: "call", callee: expr, args: [arg], ...this.at(text) };
          continue;
        }
        const chained = this.oneMember(expr);
        if (!chained)
          break;
        expr = chained;
      }
      return expr;
    }
    memberChain(expr) {
      let current = expr;
      for (; ; ) {
        const next = this.oneMember(current);
        if (!next)
          return current;
        current = next;
      }
    }
    oneMember(expr) {
      if (this.eatOp(".")) {
        const name = this.expectMemberName();
        return { kind: "member", object: expr, name, line: expr.line, column: expr.column };
      }
      if (this.eatOp("[")) {
        this.skipNl();
        const index = this.expression();
        this.skipNl();
        this.expectOp("]");
        return { kind: "index", object: expr, index, line: expr.line, column: expr.column };
      }
      return null;
    }
    callAfter(expr) {
      const mark = this.next();
      const args = this.argList();
      this.expectOp(")");
      return { kind: "call", callee: expr, args, ...this.at(mark) };
    }
    primary() {
      const token = this.peek();
      if (token.kind === "number") {
        this.next();
        const value = Number(token.value);
        if (!Number.isFinite(value))
          this.fail(token, "that number is not usable");
        return { kind: "number", raw: token.value, value, ...this.at(token) };
      }
      if (token.kind === "string") {
        this.next();
        return { kind: "string", value: token.value, ...this.at(token) };
      }
      if (token.kind === "template") {
        this.next();
        return this.templateExpr(token);
      }
      if (token.kind === "keyword" && token.value === "true") {
        this.next();
        return { kind: "bool", value: true, ...this.at(token) };
      }
      if (token.kind === "keyword" && token.value === "false") {
        this.next();
        return { kind: "bool", value: false, ...this.at(token) };
      }
      if (token.kind === "keyword" && token.value === "nil") {
        this.next();
        return { kind: "nil", ...this.at(token) };
      }
      if (token.kind === "keyword" && token.value === "self") {
        this.next();
        return { kind: "self", ...this.at(token) };
      }
      if (token.kind === "keyword" && token.value === "super")
        return this.superExpr();
      if (token.kind === "keyword" && token.value === "fn")
        return this.fnExpr(false);
      if (this.startsAsyncFn()) {
        this.next();
        this.skipNl();
        return this.fnExpr(true);
      }
      if (token.kind === "ident") {
        this.next();
        return { kind: "name", name: token.value, ...this.at(token) };
      }
      if (token.kind === "op" && token.value === "(")
        return this.group();
      if (token.kind === "op" && token.value === "[")
        return this.list();
      if (token.kind === "op" && token.value === "{")
        return this.record();
      this.fail(token, "expected a value");
    }
    superExpr() {
      const start = this.next();
      if (this.eatOp(".")) {
        const method = this.expectMemberName();
        if (!this.eatOp("("))
          this.fail(this.peek(), `super.${method} needs ()`);
        const args2 = this.argList();
        this.expectOp(")");
        return { kind: "super", method, args: args2, ...this.at(start) };
      }
      if (!this.eatOp("("))
        this.fail(this.peek(), "super needs (), or super.method()");
      const args = this.argList();
      this.expectOp(")");
      return { kind: "super", method: null, args, ...this.at(start) };
    }
    fnExpr(async) {
      const start = this.next();
      if (this.peek().kind === "ident") {
        this.fail(this.peek(), "a named fn is a statement. Here, write fn(x)");
      }
      const params = this.params();
      const type = this.parseAsType();
      const body = this.statements(/* @__PURE__ */ new Set(["end"]));
      this.expectKeyword("end");
      return { kind: "fn", params, body, async, type, ...this.at(start) };
    }
    group() {
      this.next();
      this.skipNl();
      const expr = this.expression();
      this.skipNl();
      this.expectOp(")");
      return expr;
    }
    list() {
      const start = this.next();
      const items = [];
      this.skipNl();
      if (!this.eatOp("]")) {
        for (; ; ) {
          items.push(this.expression());
          this.skipNl();
          if (!this.eatOp(","))
            break;
          this.skipNl();
          if (this.peek().kind === "op" && this.peek().value === "]")
            break;
        }
        this.expectOp("]");
      }
      return { kind: "list", items, ...this.at(start) };
    }
    record() {
      const start = this.next();
      const fields = [];
      this.skipNl();
      if (!this.eatOp("}")) {
        for (; ; ) {
          const key = this.peek();
          let name = "";
          if (key.kind === "ident")
            name = this.expectMemberName();
          else if (key.kind === "string") {
            this.next();
            name = key.value;
          } else
            this.fail(key, "a record field needs a name");
          if (!this.eatOp(":"))
            this.fail(this.peek(), `field ${name} needs : and a value`);
          this.skipNl();
          fields.push({ name, value: this.expression() });
          this.skipNl();
          if (!this.eatOp(","))
            break;
          this.skipNl();
          if (this.peek().kind === "op" && this.peek().value === "}")
            break;
        }
        this.expectOp("}");
      }
      return { kind: "record", fields, ...this.at(start) };
    }
    params() {
      this.expectOp("(");
      const params = [];
      this.skipNl();
      if (this.eatOp(")"))
        return params;
      for (; ; ) {
        const mark = this.peek();
        const name = this.expectIdent();
        if (params.some((param) => param.name === name))
          this.fail(mark, `${name} is already a parameter`);
        const type = this.parseAsType();
        params.push({ name, type, ...this.at(mark) });
        this.skipNl();
        if (!this.eatOp(","))
          break;
        this.skipNl();
        if (this.peek().kind === "op" && this.peek().value === ")")
          break;
      }
      this.expectOp(")");
      return params;
    }
    argList() {
      const args = [];
      this.skipNl();
      if (this.peek().kind === "op" && this.peek().value === ")")
        return args;
      for (; ; ) {
        args.push(this.expression());
        this.skipNl();
        if (!this.eatOp(","))
          break;
        this.skipNl();
        if (this.peek().kind === "op" && this.peek().value === ")")
          break;
      }
      return args;
    }
    binaryOp(token) {
      if (token.kind === "keyword" && token.value === "or")
        return { op: "or", prec: 1, right: false };
      if (token.kind === "keyword" && token.value === "and")
        return { op: "and", prec: 2, right: false };
      if (token.kind === "ident" && token.value.toLowerCase() === "mod")
        return { op: "%", prec: 6, right: false };
      if (token.kind !== "op")
        return null;
      switch (token.value) {
        case "==":
        case "!=":
        case "<>":
        case "<":
        case ">":
        case "<=":
        case ">=":
          return { op: token.value, prec: 3, right: false };
        case "..":
        case "&":
          return { op: "&", prec: 4, right: false };
        case "+":
        case "-":
          return { op: token.value, prec: 5, right: false };
        case "*":
        case "/":
        case "%":
          return { op: token.value, prec: 6, right: false };
        case "^":
          return { op: "^", prec: 8, right: true };
        default:
          return null;
      }
    }
    isTarget(expr) {
      return expr.kind === "name" || expr.kind === "member" || expr.kind === "index";
    }
    closes() {
      const token = this.peek();
      if (token.kind === "eof" || token.kind === "newline")
        return true;
      if (token.kind === "op" && (token.value === ":" || token.value === ";"))
        return true;
      if (token.kind === "keyword") {
        return token.value === "end" || token.value === "else" || token.value === "elseif" || token.value === "until" || token.value === "catch" || token.value === "finally";
      }
      return false;
    }
    finish(stop) {
      const token = this.peek();
      if (token.kind === "eof")
        return;
      if (token.kind === "newline") {
        this.next();
        return;
      }
      if (token.kind === "op" && (token.value === ":" || token.value === ";")) {
        this.next();
        return;
      }
      if (token.kind === "keyword" && stop.has(token.value))
        return;
      this.fail(token, "expected a new line or : before this");
    }
    /** A property can use a JavaScript word. A variable cannot. */
    expectMemberName() {
      const token = this.peek();
      if (token.kind !== "ident")
        this.fail(token, "expected a name");
      this.next();
      if (token.value.startsWith("__magic"))
        this.fail(token, "names cannot start with __magic");
      return token.value;
    }
    /** `async` is a word before `fn`. It can still be a variable name. */
    startsAsyncFn() {
      const token = this.peek();
      if (token.kind !== "ident" || token.value.toLowerCase() !== "async")
        return false;
      let offset = 1;
      while (this.peek(offset).kind === "newline")
        offset += 1;
      const next = this.peek(offset);
      return next.kind === "keyword" && next.value === "fn";
    }
    /**
     * A name as it is exported by another module. JavaScript may export `default`
     * or a reserved word. The local binding still has to be a Magic name.
     */
    expectImportedName() {
      const token = this.peek();
      if (token.kind !== "ident" && token.kind !== "keyword")
        this.fail(token, "expected a name");
      this.next();
      if (token.value.startsWith("__magic"))
        this.fail(token, "names cannot start with __magic");
      return token.value;
    }
    asLocalName(imported) {
      const token = this.peek();
      if (imported.startsWith("__magic"))
        this.fail(token, "names cannot start with __magic");
      if (JS_RESERVED.has(imported))
        this.fail(token, `${imported} is reserved. Pick another name`);
      const lower = imported.toLowerCase();
      if (lower === "import" || lower === "from" || lower === "class" || lower === "fn" || lower === "end" || lower === "if" || lower === "then" || lower === "else" || lower === "elseif" || lower === "for" || lower === "while" || lower === "repeat" || lower === "until" || lower === "return" || lower === "break" || lower === "continue" || lower === "let" || lower === "print" || lower === "and" || lower === "or" || lower === "not" || lower === "true" || lower === "false" || lower === "nil" || lower === "new" || lower === "self" || lower === "super" || lower === "try" || lower === "catch" || lower === "finally" || lower === "throw" || lower === "await") {
        this.fail(token, `${imported} is a Magic word. Pick another name`);
      }
      return imported;
    }
    /** `fn new` is the constructor. `new` stays a keyword everywhere else. */
    methodName() {
      const token = this.peek();
      if (token.kind === "keyword" && token.value === "new") {
        this.next();
        return "new";
      }
      return this.expectIdent();
    }
    expectIdent() {
      const token = this.peek();
      if (token.kind === "keyword")
        this.fail(token, `${token.value} is a Magic word. Pick another name`);
      this.expectKind("ident", "expected a name");
      if (token.value.startsWith("__magic")) {
        this.fail(token, "names cannot start with __magic");
      }
      if (JS_RESERVED.has(token.value)) {
        this.fail(token, `${token.value} is reserved. Pick another name`);
      }
      return token.value;
    }
    expectKeyword(value) {
      const token = this.peek();
      if (token.kind === "keyword" && token.value === value)
        return this.next();
      this.fail(token, `expected ${value}`);
    }
    expectOp(value) {
      const token = this.peek();
      if (token.kind === "op" && token.value === value)
        return this.next();
      this.fail(token, `expected ${value}`);
    }
    expectKind(kind, message) {
      const token = this.peek();
      if (token.kind !== kind)
        this.fail(token, message);
      return this.next();
    }
    eatOp(value) {
      if (this.peek().kind === "op" && this.peek().value === value) {
        this.next();
        return true;
      }
      return false;
    }
    eatWord(word) {
      const token = this.peek();
      const wordLike = token.kind === "ident" || token.kind === "keyword";
      if (wordLike && token.value.toLowerCase() === word) {
        this.next();
        return true;
      }
      return false;
    }
    skipNl() {
      while (this.peek().kind === "newline")
        this.next();
    }
    peek(offset = 0) {
      return this.tokens[Math.min(this.i + offset, this.tokens.length - 1)];
    }
    next() {
      const token = this.peek();
      if (token.kind !== "eof")
        this.i += 1;
      return token;
    }
    at(token) {
      return { line: token.line, column: token.column };
    }
    stopText(stop) {
      const words = [...stop].filter((word) => word !== "eof");
      return words.length > 0 ? words.join(" or ") : "end";
    }
    fail(token, message) {
      throw new MagicError(message, token.line, token.column, this.filename);
    }
    tag(node, annotations) {
      if (annotations.length)
        node.annotations = annotations;
      return node;
    }
    takeAnnotations() {
      const list = [];
      for (; ; ) {
        this.skipNl();
        if (this.peek().kind !== "op" || this.peek().value !== "@")
          break;
        list.push(this.annotation());
        const sep = this.peek();
        if (sep.kind === "op" && (sep.value === ":" || sep.value === ";"))
          this.next();
      }
      return list;
    }
    annotation() {
      const start = this.next();
      const nameToken = this.peek();
      let name = "";
      if (nameToken.kind === "number") {
        const next = this.peek(1);
        const joined = next.kind === "ident" ? `${nameToken.value}${next.value}`.toLowerCase() : "";
        if (!moduleKey(joined))
          this.fail(nameToken, "expected a name after @");
        this.next();
        this.next();
        name = joined;
      } else if (nameToken.kind === "ident") {
        this.next();
        name = nameToken.value.toLowerCase();
      } else {
        this.fail(nameToken, "expected a name after @");
      }
      if (name.startsWith("__magic"))
        this.fail(nameToken, "names cannot start with __magic");
      const alias = this.eatWord("as") ? this.expectIdent() : null;
      const args = [];
      const called = this.eatOp("(");
      if (called) {
        this.skipNl();
        if (!this.eatOp(")")) {
          for (; ; ) {
            args.push(this.expression());
            this.skipNl();
            if (!this.eatOp(","))
              break;
            this.skipNl();
            if (this.peek().kind === "op" && this.peek().value === ")")
              break;
          }
          this.expectOp(")");
        }
      }
      return { name, alias, args, called, ...this.at(start) };
    }
    parseAsType() {
      if (!this.eatWord("as"))
        return null;
      this.skipNl();
      return this.parseType();
    }
    parseType() {
      const token = this.peek();
      if (token.kind === "keyword" && (token.value === "fn" || token.value === "nil")) {
        this.next();
        return { name: token.value, ...this.at(token) };
      }
      if (token.kind !== "ident")
        this.fail(token, "expected a type name");
      this.next();
      if (token.value.startsWith("__magic"))
        this.fail(token, "names cannot start with __magic");
      return { name: token.value, ...this.at(token) };
    }
    accessWord() {
      const token = this.peek();
      if (token.kind !== "ident")
        return null;
      const word = token.value.toLowerCase();
      if (word !== "public" && word !== "private" && word !== "protected")
        return null;
      this.next();
      this.skipNl();
      return word;
    }
    mergeAccess(word, annotations, node) {
      let fromAnn = null;
      for (const ann of annotations) {
        if (ann.name === "public" || ann.name === "private" || ann.name === "protected") {
          if (fromAnn && fromAnn !== ann.name) {
            this.fail(ann, `${fromAnn} and ${ann.name} disagree`);
          }
          fromAnn = ann.name;
        }
      }
      if (word && fromAnn && word !== fromAnn)
        this.fail(node, `${word} and ${fromAnn} disagree`);
      return word ?? fromAnn;
    }
    templateExpr(token) {
      const parts = [];
      for (const part of token.parts ?? []) {
        if (part.kind === "text") {
          parts.push({ text: part.value });
          continue;
        }
        parts.push({ expr: _Parser.expression(part.source, this.filename, part.line, part.column) });
      }
      return { kind: "template", parts, line: token.line, column: token.column };
    }
    /** One expression, used for the holes in a template. */
    static expression(source, filename, line, column) {
      const parser = new _Parser(filename);
      parser.tokens = new Lexer(source, filename, line, column).tokenize();
      parser.i = 0;
      parser.skipNl();
      if (parser.peek().kind === "eof") {
        throw new MagicError("this interpolation is empty", line, column, filename);
      }
      const expr = parser.expression();
      parser.skipNl();
      const next = parser.peek();
      if (next.kind !== "eof")
        parser.fail(next, "this interpolation has extra text");
      return expr;
    }
  };

  // dist/std.js
  var PRELUDE_SOURCE = `function __magic_text(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'function') return value.name ? value.name : 'fn';
  return String(value);
}

function __magic_cat(a, b) {
  return __magic_text(a) + __magic_text(b);
}

function __magic_fill() {
  let out = '';
  for (let i = 0; i < arguments.length; i += 1) out += __magic_text(arguments[i]);
  return out;
}

function __magic_len(value) {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'string') return Array.from(value).length;
  if (typeof value === 'function') return value.length;
  if (Array.isArray(value)) return value.length;
  if (typeof value === 'object') return Object.keys(value).length;
  return 0;
}

function __magic_iter(value) {
  if (typeof value === 'string') return Array.from(value);
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.keys(value);
  return [];
}

function __magic_inits(ctor, self) {
  const chain = [];
  let current = ctor;
  const seen = new Set();
  while (current && !seen.has(current)) {
    seen.add(current);
    chain.push(current);
    current = current.__magicParent || null;
  }
  for (let i = chain.length - 1; i >= 0; i -= 1) {
    const init = chain[i].__magicInit;
    if (typeof init === 'function') init.call(self);
  }
}

function __magic_super(parent, self, args) {
  const fn = parent && parent.prototype && parent.prototype.__magicNew;
  if (typeof fn === 'function') return fn.apply(self, args);
  return null;
}

function __magic_print(...args) {
  if (args.length === 0) {
    console.log('');
    return;
  }
  console.log(args.map(__magic_text).join('\\t'));
}

function __magic_num(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value === null || value === undefined || value === '') return null;
  const n = Number(String(value).trim());
  return Number.isFinite(n) ? n : null;
}

function __magic_int(value) {
  const n = __magic_num(value);
  return n === null ? null : Math.trunc(n);
}

function __magic_type(value) {
  if (value === null || value === undefined) return 'nil';
  if (Array.isArray(value)) return 'list';
  const kind = typeof value;
  if (kind === 'number') return 'number';
  if (kind === 'string') return 'string';
  if (kind === 'boolean') return 'bool';
  if (kind === 'function') return 'fn';
  if (kind === 'object') {
    const proto = Object.getPrototypeOf(value);
    const ctor = proto && proto.constructor;
    if (ctor && typeof ctor.name === 'string' && ctor.name !== '' && ctor.name !== 'Object') {
      return ctor.name;
    }
    return 'record';
  }
  return kind;
}

function __magic_keys(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return Object.keys(value);
  return [];
}

function __magic_values(value) {
  if (Array.isArray(value)) return value.slice();
  if (value && typeof value === 'object') return Object.values(value);
  return [];
}

function __magic_push(list, item) {
  if (!Array.isArray(list)) throw new Error('push expects a list');
  list.push(item);
  return item;
}

function __magic_pop(list) {
  if (!Array.isArray(list)) throw new Error('pop expects a list');
  const item = list.pop();
  return item === undefined ? null : item;
}

function __magic_time() {
  return Date.now();
}

function __magic_raise(value) {
  if (value instanceof Error) return value;
  const text = __magic_text(value);
  const err = new Error(text === '' ? 'error' : text);
  if (value && typeof value === 'object') {
    err.cause = value;
    if (typeof value.message === 'string' && value.message !== '') err.message = value.message;
  }
  return err;
}

function __magic_error(message) {
  return new Error(__magic_text(message));
}

function __magic_sleep(ms) {
  const n = Number(ms);
  const wait = Number.isFinite(n) && n > 0 ? n : 0;
  return new Promise(function (resolve) {
    setTimeout(resolve, wait);
  });
}

function __magic_decode(res, spec, kind) {
  const want = kind || (/\\.json($|\\?)/i.test(spec) ? 'json' : 'text');
  if (want === 'json') return res.json();
  if (want === 'bytes') {
    return res.arrayBuffer().then(function (buf) {
      return new Uint8Array(buf);
    });
  }
  return res.text();
}

function __magic_load(url, as) {
  const spec = url == null ? '' : String(url);
  const kind = as == null ? '' : String(as);
  const hook = globalThis.__magic_load_hook;
  if (typeof hook === 'function') return Promise.resolve(hook(spec, kind));
  return fetch(spec).then(function (res) {
    if (!res.ok) throw new Error('cannot load ' + spec);
    return __magic_decode(res, spec, kind);
  });
}
`;
  var PRELUDE_EXPORTS = [
    "__magic_print",
    "__magic_len",
    "__magic_text",
    "__magic_num",
    "__magic_int",
    "__magic_type",
    "__magic_keys",
    "__magic_values",
    "__magic_push",
    "__magic_pop",
    "__magic_time",
    "__magic_cat",
    "__magic_fill",
    "__magic_iter",
    "__magic_inits",
    "__magic_super",
    "__magic_raise",
    "__magic_error",
    "__magic_sleep",
    "__magic_load"
  ];
  var BUILTIN_JS = {
    print: "__magic_print",
    len: "__magic_len",
    str: "__magic_text",
    num: "__magic_num",
    int: "__magic_int",
    type: "__magic_type",
    keys: "__magic_keys",
    values: "__magic_values",
    push: "__magic_push",
    pop: "__magic_pop",
    time: "__magic_time",
    error: "__magic_error",
    sleep: "__magic_sleep",
    load: "__magic_load"
  };
  var BUILTIN_NAMES = [
    "print",
    "len",
    "str",
    "num",
    "int",
    "type",
    "keys",
    "values",
    "push",
    "pop",
    "time",
    "error",
    "sleep",
    "load"
  ];
  function preludeInlineSource() {
    return PRELUDE_SOURCE;
  }

  // dist/compiler.js
  var Compiler = class {
    w = new Writer();
    filename = "";
    esm = false;
    bindings = [];
    scope = { kind: "module", names: /* @__PURE__ */ new Map(), parent: null };
    scopes = /* @__PURE__ */ new WeakMap();
    root = builtinScope();
    selfExpr = null;
    superName = null;
    allowSuper = false;
    loop = 0;
    fnDepth = 0;
    canAwait = true;
    temps = 0;
    readyClasses = /* @__PURE__ */ new Set();
    defaultMode = "none";
    mode = "none";
    guards = [];
    compile(source, options = {}) {
      const filename = options.filename ?? "";
      const program = new Parser(filename).parse(source);
      return this.compileProgram(program, options);
    }
    compileProgram(program, options = {}) {
      this.reset(program.filename || options.filename || "");
      this.defaultMode = fallbackTypeMode(options);
      const target = options.target ?? "module";
      this.analyze(program);
      this.checkModuleExports(program);
      this.runCheck(program);
      if (target === "script")
        return this.compileScript(program);
      return this.compileModule(program, options);
    }
    /** True when the file awaits at the top level, so a script wrapper has to be async. */
    hasTopLevelAwait(program) {
      return this.hasTopAwait(program.body);
    }
    /** Statements for one file inside a bundle. The caller wraps them in a function. */
    emitBody(program, options) {
      this.reset(program.filename || options.filename || "");
      this.defaultMode = fallbackTypeMode(options);
      this.esm = false;
      this.bindings = options.bindings;
      this.analyze(program);
      this.checkModuleExports(program);
      this.checkBindings(program);
      this.runCheck(program);
      this.emitMain(program);
      return { code: this.w.text(), exports: this.exportNames() };
    }
    compileModule(program, options) {
      this.esm = true;
      const resolve = options.resolve ?? defaultResolve;
      const prelude = options.prelude ?? "./magic-std.js";
      this.header(program.filename);
      const imports = this.emitModuleImports(program, resolve, prelude);
      this.emitMain(program);
      return { code: this.w.text(), exports: this.exportNames(), imports, strict: this.mode === "strict", types: this.mode };
    }
    compileScript(program) {
      this.esm = false;
      const imports = this.scriptBindings(program);
      this.header(program.filename);
      const asyncMain = this.hasTopAwait(program.body);
      this.w.line(`globalThis.__magic_module = (${asyncMain ? "async " : ""}() => {`);
      this.w.push();
      this.w.line("'use strict';");
      for (const line of preludeInlineSource().split("\n"))
        this.w.line(line);
      for (const line of this.guards)
        this.w.line(line);
      this.emitMain(program);
      this.w.pop();
      this.w.line("})();");
      return { code: this.w.text(), exports: this.exportNames(), imports, strict: this.mode === "strict", types: this.mode };
    }
    header(filename) {
      const from = filename ? ` from ${filename}` : "";
      this.w.line(`// Compiled${from} by MAGIC.`);
    }
    emitModuleImports(program, resolve, prelude) {
      this.w.line(`import { ${PRELUDE_EXPORTS.join(", ")} } from ${JSON.stringify(prelude)};`);
      const compiled = [];
      for (const stmt of importsOf(program)) {
        const resolved = resolve(stmt.specifier);
        const mod = moduleBySpecifier(stmt.specifier);
        const kind = mod ? "module" : isMagicSpecifier(stmt.specifier) ? "magic" : "js";
        compiled.push({
          specifier: stmt.specifier,
          resolved,
          kind,
          module: mod ? mod.name : null,
          form: stmt.form,
          alias: stmt.alias,
          names: stmt.names
        });
        const from = JSON.stringify(resolved);
        if (stmt.form === "side") {
          this.w.line(`import ${from};`);
        } else if (stmt.form === "namespace" && stmt.alias) {
          this.w.line(`import * as ${stmt.alias} from ${from};`);
        } else {
          const names = stmt.names.map((name) => name.imported === name.local ? name.imported : `${name.imported} as ${name.local}`).join(", ");
          this.w.line(`import { ${names} } from ${from};`);
        }
      }
      return compiled;
    }
    scriptBindings(program) {
      const compiled = [];
      for (const stmt of importsOf(program)) {
        if (isMagicSpecifier(stmt.specifier)) {
          this.oops(stmt, "this script imports another Magic file. Use magic run, or magic compile -o");
        }
        if (isJsSpecifier(stmt.specifier)) {
          this.oops(stmt, "this script imports a JavaScript file. Use magic run, or magic compile -o");
        }
        const info = moduleBySpecifier(stmt.specifier);
        if (!info)
          this.oops(stmt, `${stmt.specifier} is not a Magic module`);
        const ns = moduleNs(info.name);
        if (!this.guards.some((line) => line.startsWith(`const ${ns} =`))) {
          this.guards.push(`const ${ns} = ${info.script};`);
          this.guards.push(`if (!${ns}) throw new Error(${JSON.stringify(`${info.name} is not loaded`)});`);
        }
        compiled.push({
          specifier: stmt.specifier,
          resolved: info.script,
          kind: "module",
          module: info.name,
          form: stmt.form,
          alias: stmt.alias,
          names: stmt.names
        });
        if (stmt.form === "namespace" && stmt.alias)
          this.bindings.push({ local: stmt.alias, expr: ns });
        if (stmt.form === "named") {
          for (const name of stmt.names)
            this.bindings.push({ local: name.local, expr: `${ns}.${name.imported}` });
        }
      }
      return compiled;
    }
    checkBindings(program) {
      const have = new Set(this.bindings.map((binding) => binding.local));
      for (const stmt of importsOf(program)) {
        const locals = stmt.form === "namespace" && stmt.alias ? [stmt.alias] : stmt.names.map((name) => name.local);
        for (const local of locals) {
          if (!have.has(local))
            this.oops(stmt, `missing a binding for ${local}`);
        }
      }
    }
    emitMain(program) {
      this.scope = this.scopes.get(program) ?? this.scope;
      for (const binding of this.bindings)
        this.w.line(`const ${binding.local} = ${binding.expr};`);
      this.emitHoist(this.scope);
      for (const stmt of program.body) {
        if (stmt.kind === "import")
          continue;
        this.emitStmt(stmt);
      }
      if (!this.esm)
        this.w.line(`return { ${this.exportNames().join(", ")} };`);
    }
    emitHoist(scope, skip) {
      for (const [name, kind] of scope.names) {
        if (kind !== "let" || skip?.has(name))
          continue;
        if (this.esm && scope.kind === "module")
          this.w.line(`export let ${name};`);
        else
          this.w.line(`let ${name};`);
      }
    }
    exportNames() {
      const scope = this.scopes.get(this.programKey) ?? this.scope;
      const names = [];
      for (const [name, kind] of scope.names) {
        if (kind === "let" || kind === "fn" || kind === "class")
          names.push(name);
      }
      return names;
    }
    programKey = {};
    emitStmt(stmt) {
      switch (stmt.kind) {
        case "import":
          return;
        case "fn":
          this.emitFn(stmt);
          return;
        case "class":
          this.emitClass(stmt);
          return;
        case "let":
          if (stmt.init)
            this.w.line(`${stmt.name} = ${this.expr(stmt.init)};`);
          return;
        case "assign":
          this.emitAssign(stmt);
          return;
        case "print":
          this.w.line(`__magic_print(${stmt.args.map((arg) => this.expr(arg)).join(", ")});`);
          return;
        case "expr":
          this.w.line(`${this.expr(stmt.expr)};`);
          return;
        case "throw":
          this.w.line(`throw __magic_raise(${this.expr(stmt.value)});`);
          return;
        case "try":
          this.emitTry(stmt);
          return;
        case "return":
          if (this.fnDepth <= 0)
            this.oops(stmt, "return belongs inside a fn");
          this.w.line(stmt.value ? `return ${this.expr(stmt.value)};` : "return;");
          return;
        case "break":
          if (this.loop <= 0)
            this.oops(stmt, "break belongs inside a for, while, or repeat");
          this.w.line("break;");
          return;
        case "continue":
          if (this.loop <= 0)
            this.oops(stmt, "continue belongs inside a for, while, or repeat");
          this.w.line("continue;");
          return;
        case "if":
          this.emitIf(stmt);
          return;
        case "while":
          this.emitWhile(stmt);
          return;
        case "repeat":
          this.emitRepeat(stmt);
          return;
        case "for":
          this.emitFor(stmt);
          return;
        default:
          return;
      }
    }
    emitTry(stmt) {
      this.w.line("try {");
      this.w.push();
      this.emitScopeBody(stmt.body, stmt);
      this.w.pop();
      if (stmt.catchBody) {
        const skip = stmt.catchName ? /* @__PURE__ */ new Set([stmt.catchName]) : void 0;
        this.w.line(stmt.catchName ? `} catch (${stmt.catchName}) {` : "} catch {");
        this.w.push();
        this.emitScopeBody(stmt.catchBody, stmt.catchBody, false, skip);
        this.w.pop();
      }
      if (stmt.finallyBody) {
        this.w.line("} finally {");
        this.w.push();
        this.emitScopeBody(stmt.finallyBody, stmt.finallyBody);
        this.w.pop();
      }
      this.w.line("}");
    }
    emitIf(stmt) {
      const live = [];
      for (const arm of stmt.arms) {
        const folded = foldExpr(arm.test);
        const known = constantTruth(folded);
        if (known === false)
          continue;
        if (known === true) {
          live.push({ test: null, body: arm.body, key: arm });
          this.emitIfChain(live);
          return;
        }
        live.push({ test: folded, body: arm.body, key: arm });
      }
      if (stmt.elseBody)
        live.push({ test: null, body: stmt.elseBody, key: stmt.elseBody });
      this.emitIfChain(live);
    }
    /** A constant-true arm, or an else, is the last piece and has a null test. */
    emitIfChain(live) {
      let tail = null;
      if (live.length > 0 && live[live.length - 1].test === null) {
        const last = live.pop();
        tail = { body: last.body, key: last.key };
      }
      if (live.length === 0) {
        if (tail)
          this.emitBraced(tail.body, tail.key);
        return;
      }
      live.forEach((arm, index) => {
        this.w.line(`${index === 0 ? "if" : "} else if"} (${this.expr(arm.test)}) {`);
        this.w.push();
        this.emitScopeBody(arm.body, arm.key);
        this.w.pop();
      });
      if (tail) {
        this.w.line("} else {");
        this.w.push();
        this.emitScopeBody(tail.body, tail.key);
        this.w.pop();
      }
      this.w.line("}");
    }
    emitWhile(stmt) {
      const folded = foldExpr(stmt.test);
      const known = constantTruth(folded);
      if (known === false)
        return;
      this.w.line(`while (${known === true ? "true" : this.expr(folded)}) {`);
      this.w.push();
      this.emitScopeBody(stmt.body, stmt, true);
      this.w.pop();
      this.w.line("}");
    }
    emitRepeat(stmt) {
      const folded = foldExpr(stmt.test);
      const known = constantTruth(folded);
      if (known === true) {
        this.emitBraced(stmt.body, stmt, true);
        return;
      }
      this.w.line("do {");
      this.w.push();
      this.emitScopeBody(stmt.body, stmt, true);
      this.w.pop();
      this.w.line(`} while (!(${known === false ? "false" : this.expr(folded)}));`);
    }
    emitFor(stmt) {
      if (stmt.iter) {
        const item = this.temp();
        this.w.line(`for (const ${item} of __magic_iter(${this.expr(stmt.iter)})) {`);
        this.w.push();
        const saved = this.scope;
        const savedLoop = this.loop;
        this.scope = this.needScope(stmt, "for");
        this.loop += 1;
        this.emitHoist(this.scope);
        this.w.line(`${stmt.name} = ${item};`);
        for (const inner of stmt.body)
          this.emitStmt(inner);
        this.loop = savedLoop;
        this.scope = saved;
        this.w.pop();
        this.w.line("}");
        return;
      }
      const from = this.temp();
      const to = this.temp();
      const step = this.temp();
      this.w.line("{");
      this.w.push();
      this.w.line(`const ${from} = ${this.expr(stmt.from)};`);
      this.w.line(`const ${to} = ${this.expr(stmt.to)};`);
      this.w.line(`const ${step} = ${stmt.step ? this.expr(stmt.step) : "1"};`);
      this.w.line(`for (let ${stmt.name} = ${from}; ${step} >= 0 ? ${stmt.name} <= ${to} : ${stmt.name} >= ${to}; ${stmt.name} = ${stmt.name} + ${step}) {`);
      this.w.push();
      this.emitScopeBody(stmt.body, stmt, true, /* @__PURE__ */ new Set([stmt.name]));
      this.w.pop();
      this.w.line("}");
      this.w.pop();
      this.w.line("}");
    }
    /** Locals of this block are declared here, not on the function, so they die with the block. */
    emitScopeBody(body, key, loop = false, skip) {
      const saved = this.scope;
      const savedLoop = this.loop;
      this.scope = this.needScope(key, "block");
      if (loop)
        this.loop += 1;
      this.emitHoist(this.scope, skip);
      for (const stmt of body)
        this.emitStmt(stmt);
      this.loop = savedLoop;
      this.scope = saved;
    }
    emitBraced(body, key, loop = false) {
      this.w.line("{");
      this.w.push();
      this.emitScopeBody(body, key, loop);
      this.w.pop();
      this.w.line("}");
    }
    emitAssign(stmt) {
      const math = stmt.op === "=" ? null : stmt.op[0];
      if (stmt.target.kind === "name") {
        const left = this.assignable(stmt.target.name, stmt);
        const right = this.expr(stmt.value);
        this.w.line(math ? `${left} = ${left} ${math} (${right});` : `${left} = ${right};`);
        return;
      }
      const object = this.temp();
      this.w.line("{");
      this.w.push();
      if (stmt.target.kind === "member") {
        this.w.line(`const ${object} = ${this.expr(stmt.target.object)};`);
        const slot = `${object}.${stmt.target.name}`;
        const right = this.expr(stmt.value);
        this.w.line(math ? `${slot} = ${slot} ${math} (${right});` : `${slot} = ${right};`);
      } else if (stmt.target.kind === "index") {
        const index = this.temp();
        this.w.line(`const ${object} = ${this.expr(stmt.target.object)};`);
        this.w.line(`const ${index} = ${this.expr(stmt.target.index)};`);
        const slot = `${object}[${index}]`;
        const right = this.expr(stmt.value);
        this.w.line(math ? `${slot} = ${slot} ${math} (${right});` : `${slot} = ${right};`);
      } else {
        this.oops(stmt, "this cannot be assigned to");
      }
      this.w.pop();
      this.w.line("}");
    }
    emitFn(stmt) {
      const scope = this.needScope(stmt, stmt.name);
      const exporting = this.esm && this.scope.kind === "module";
      const header = `${exporting ? "export " : ""}${stmt.async ? "async " : ""}function ${stmt.name}(${paramNames(stmt.params)}) {`;
      this.emitFnBody(header, stmt.body, scope, {
        bindSelf: false,
        inheritSelf: true,
        allowSuper: this.allowSuper,
        superName: this.superName,
        selfExpr: this.selfExpr,
        canAwait: stmt.async
      });
    }
    emitClass(stmt) {
      if (stmt.parent) {
        const found = this.scope.names.get(stmt.parent);
        if (found === "class" && !this.readyClasses.has(stmt.parent)) {
          this.oops(stmt, `write class ${stmt.parent} before class ${stmt.name}`);
        }
      }
      const parentJs = stmt.parent ? this.ref(stmt.parent) : null;
      const exporting = this.esm && this.scope.kind === "module";
      this.w.line(`${exporting ? "export " : ""}function ${stmt.name}(...__magic_args) {`);
      this.w.push();
      this.w.line(`if (!new.target) return Reflect.construct(${stmt.name}, __magic_args);`);
      this.w.line("__magic_inits(new.target, this);");
      this.w.line("const __magic_ctor = new.target.prototype.__magicNew;");
      this.w.line('if (typeof __magic_ctor === "function") __magic_ctor.apply(this, __magic_args);');
      this.w.line("return this;");
      this.w.pop();
      this.w.line("}");
      this.w.line(`${stmt.name}.__magicParent = ${parentJs ?? "null"};`);
      this.emitInit(stmt);
      if (parentJs) {
        this.w.line(`${stmt.name}.prototype = Object.create(${parentJs}.prototype);`);
        this.w.line(`${stmt.name}.prototype.constructor = ${stmt.name};`);
      }
      for (const method of stmt.methods)
        this.emitMethod(stmt.name, method, parentJs);
      this.readyClasses.add(stmt.name);
    }
    emitInit(stmt) {
      this.w.line(`${stmt.name}.__magicInit = function () {`);
      this.w.push();
      const saved = this.saveFlags();
      this.selfExpr = "__magic_self";
      this.allowSuper = false;
      this.superName = null;
      this.canAwait = false;
      this.w.line("const __magic_self = this;");
      for (const field of stmt.fields) {
        this.w.line(`__magic_self.${field.name} = ${this.expr(field.init)};`);
      }
      this.restoreFlags(saved);
      this.w.pop();
      this.w.line("};");
    }
    emitMethod(className, method, parentJs) {
      const scope = this.needScope(method, method.name);
      const jsName = method.name === "new" ? "__magicNew" : method.name;
      const header = `${className}.prototype.${jsName} = ${method.async ? "async " : ""}function (${paramNames(method.params)}) {`;
      this.emitFnBody(header, method.body, scope, {
        bindSelf: true,
        inheritSelf: false,
        allowSuper: parentJs !== null,
        superName: parentJs,
        selfExpr: null,
        canAwait: method.async
      });
    }
    emitFnBody(header, body, scope, flags) {
      const saved = this.saveFlags();
      const savedScope = this.scope;
      const savedLoop = this.loop;
      const savedDepth = this.fnDepth;
      this.scope = scope;
      this.loop = 0;
      this.fnDepth = savedDepth + 1;
      if (!flags.inheritSelf) {
        this.selfExpr = null;
        this.superName = null;
        this.allowSuper = false;
      }
      if (flags.bindSelf) {
        this.selfExpr = "__magic_self";
        this.allowSuper = flags.allowSuper;
        this.superName = flags.superName;
      }
      this.canAwait = flags.canAwait;
      this.w.line(header);
      this.w.push();
      if (flags.bindSelf)
        this.w.line("const __magic_self = this;");
      this.emitHoist(scope);
      for (const stmt of body)
        this.emitStmt(stmt);
      this.w.pop();
      this.w.line("}");
      this.scope = savedScope;
      this.loop = savedLoop;
      this.fnDepth = savedDepth;
      this.restoreFlags(saved);
    }
    emitAnon(expr) {
      const scope = this.needScope(expr, "fn");
      const sub = new Writer(this.w.indent);
      const savedWriter = this.w;
      this.w = sub;
      this.emitFnBody(`${expr.async ? "async " : ""}function (${paramNames(expr.params)}) {`, expr.body, scope, {
        bindSelf: false,
        inheritSelf: true,
        allowSuper: this.allowSuper,
        superName: this.superName,
        selfExpr: this.selfExpr,
        canAwait: expr.async
      });
      this.w = savedWriter;
      return `(${sub.text().trim()})`;
    }
    expr(node) {
      const expr = foldExpr(node);
      switch (expr.kind) {
        case "number":
          return expr.raw;
        case "string":
          return JSON.stringify(expr.value);
        case "template": {
          const args = expr.parts.map((part) => "text" in part ? JSON.stringify(part.text) : this.expr(part.expr));
          if (args.length === 1 && expr.parts[0] && "text" in expr.parts[0])
            return args[0];
          return `__magic_fill(${args.join(", ")})`;
        }
        case "bool":
          return expr.value ? "true" : "false";
        case "nil":
          return "null";
        case "name":
          return this.ref(expr.name);
        case "self":
          return this.selfRef(expr);
        case "list":
          return `[${expr.items.map((item) => this.expr(item)).join(", ")}]`;
        case "record":
          return `({ ${expr.fields.map((field) => `${this.prop(field.name)}: ${this.expr(field.value)}`).join(", ")} })`;
        case "unary":
          if (expr.op === "not")
            return `!(${this.expr(expr.expr)})`;
          if (expr.op === "#")
            return `__magic_len(${this.expr(expr.expr)})`;
          return `-(${this.expr(expr.expr)})`;
        case "binary":
          return this.binary(expr);
        case "call":
          return `${this.callee(expr.callee)}(${expr.args.map((arg) => this.expr(arg)).join(", ")})`;
        case "member":
          return `${this.expr(expr.object)}.${expr.name}`;
        case "index":
          return `${this.expr(expr.object)}[${this.expr(expr.index)}]`;
        case "new":
          return `new ${this.callee(expr.callee)}(${expr.args.map((arg) => this.expr(arg)).join(", ")})`;
        case "fn":
          return this.emitAnon(expr);
        case "super":
          return this.superCall(expr);
        case "await":
          if (!this.canAwait)
            this.oops(expr, "await belongs inside an async fn");
          return `await (${this.expr(expr.expr)})`;
        default:
          return "null";
      }
    }
    binary(expr) {
      const left = this.expr(expr.left);
      const right = this.expr(expr.right);
      if (expr.op === "&")
        return `__magic_cat(${left}, ${right})`;
      if (expr.op === "^")
        return `Math.pow(${left}, ${right})`;
      const op = expr.op === "and" ? "&&" : expr.op === "or" ? "||" : expr.op === "==" ? "===" : expr.op === "!=" || expr.op === "<>" ? "!==" : expr.op;
      return `(${left} ${op} ${right})`;
    }
    superCall(expr) {
      if (!this.allowSuper || !this.superName) {
        this.oops(expr, "super needs a parent. Write class Child is Parent");
      }
      if (expr.method === null) {
        const args2 = expr.args.map((arg) => this.expr(arg)).join(", ");
        return `__magic_super(${this.superName}, __magic_self, [${args2}])`;
      }
      const args = ["__magic_self", ...expr.args.map((arg) => this.expr(arg))].join(", ");
      return `${this.superName}.prototype.${expr.method}.call(${args})`;
    }
    prop(name) {
      return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : JSON.stringify(name);
    }
    callee(expr) {
      if (expr.kind === "name")
        return this.ref(expr.name);
      if (expr.kind === "member")
        return `${this.expr(expr.object)}.${expr.name}`;
      if (expr.kind === "index")
        return this.expr(expr);
      return `(${this.expr(expr)})`;
    }
    ref(name) {
      const found = this.lookup(name);
      if (!found)
        return name === "globalThis" ? "globalThis" : `globalThis.${name}`;
      if (found.kind === "builtin")
        return BUILTIN_JS[name] ?? name;
      return name;
    }
    assignable(name, node) {
      const found = this.lookup(name);
      if (!found)
        this.oops(node, `${name} is not declared`);
      if (found.kind === "builtin")
        this.oops(node, `${name} is a Magic word. Pick another name`);
      if (found.kind === "import")
        this.oops(node, `${name} is imported. Pick another name`);
      if (found.kind === "fn")
        this.oops(node, `${name} is a function`);
      if (found.kind === "class")
        this.oops(node, `${name} is a class`);
      return name;
    }
    selfRef(node) {
      if (!this.selfExpr)
        this.oops(node, "self belongs inside a class");
      return this.selfExpr;
    }
    analyze(program) {
      const moduleScope = { kind: "module", names: /* @__PURE__ */ new Map(), parent: this.root };
      this.programKey = program;
      this.analyzeBody(program.body, moduleScope, program);
    }
    analyzeBody(body, scope, key) {
      this.scopes.set(key, scope);
      this.scanSurface(body, scope);
      this.scanNested(body, scope);
    }
    scanSurface(body, scope) {
      for (const stmt of body)
        this.scanStmt(stmt, scope);
    }
    scanStmt(stmt, scope) {
      switch (stmt.kind) {
        case "import":
          if (scope.kind !== "module") {
            const word = stmt.via === "use" ? "use" : "import";
            this.oops(stmt, `${word} belongs at the top of the script`);
          }
          if (stmt.form === "star") {
            this.oops(stmt, `cannot see the exports of ${JSON.stringify(stmt.specifier)} from here. Write use ${JSON.stringify(stmt.specifier)} as name`);
          }
          if (stmt.form === "namespace" && stmt.alias)
            this.declare(scope, stmt.alias, "import", stmt);
          for (const name of stmt.names)
            this.declare(scope, name.local, "import", stmt);
          return;
        case "fn":
          this.declare(scope, stmt.name, "fn", stmt);
          return;
        case "class":
          if (scope.kind !== "module")
            this.oops(stmt, "class belongs at the top of the script");
          this.declare(scope, stmt.name, "class", stmt);
          return;
        case "let":
          this.declare(scope, stmt.name, "let", stmt);
          return;
        case "assign":
          this.scanAssign(stmt, scope);
          return;
        default:
          return;
      }
    }
    scanAssign(stmt, scope) {
      if (stmt.target.kind !== "name")
        return;
      const found = this.lookupFrom(scope, stmt.target.name);
      if (!found) {
        scope.names.set(stmt.target.name, "let");
        return;
      }
      if (found.kind === "builtin")
        this.oops(stmt, `${stmt.target.name} is a Magic word. Pick another name`);
      if (found.kind === "import")
        this.oops(stmt, `${stmt.target.name} is imported. Pick another name`);
      if (found.kind === "fn")
        this.oops(stmt, `${stmt.target.name} is a function`);
      if (found.kind === "class")
        this.oops(stmt, `${stmt.target.name} is a class`);
    }
    scanNested(body, scope) {
      for (const stmt of body)
        this.nestStmt(stmt, scope);
    }
    nestStmt(stmt, scope) {
      switch (stmt.kind) {
        case "fn":
          this.analyzeFunction(stmt.body, stmt.params, scope, stmt);
          return;
        case "class":
          for (const method of stmt.methods)
            this.analyzeFunction(method.body, method.params, scope, method);
          for (const field of stmt.fields)
            this.nestExpr(field.init, scope);
          return;
        case "if":
          for (const arm of stmt.arms) {
            this.nestExpr(arm.test, scope);
            this.analyzeBody(arm.body, this.blockScope(scope), arm);
          }
          if (stmt.elseBody)
            this.analyzeBody(stmt.elseBody, this.blockScope(scope), stmt.elseBody);
          return;
        case "while":
          this.nestExpr(stmt.test, scope);
          this.analyzeBody(stmt.body, this.blockScope(scope), stmt);
          return;
        case "repeat":
          this.analyzeBody(stmt.body, this.blockScope(scope), stmt);
          this.nestExpr(stmt.test, scope);
          return;
        case "for":
          this.nestExpr(stmt.from, scope);
          this.nestExpr(stmt.to, scope);
          this.nestExpr(stmt.step, scope);
          this.nestExpr(stmt.iter, scope);
          {
            const child = this.blockScope(scope);
            this.declare(child, stmt.name, "let", stmt);
            this.analyzeBody(stmt.body, child, stmt);
          }
          return;
        case "let":
          this.nestExpr(stmt.init, scope);
          return;
        case "assign":
          this.nestExpr(stmt.target, scope);
          this.nestExpr(stmt.value, scope);
          return;
        case "print":
          for (const arg of stmt.args)
            this.nestExpr(arg, scope);
          return;
        case "expr":
          this.nestExpr(stmt.expr, scope);
          return;
        case "return":
          this.nestExpr(stmt.value, scope);
          return;
        case "throw":
          this.nestExpr(stmt.value, scope);
          return;
        case "try":
          this.analyzeBody(stmt.body, this.blockScope(scope), stmt);
          if (stmt.catchBody) {
            const child = this.blockScope(scope);
            if (stmt.catchName)
              this.declare(child, stmt.catchName, "let", stmt);
            this.analyzeBody(stmt.catchBody, child, stmt.catchBody);
          }
          if (stmt.finallyBody)
            this.analyzeBody(stmt.finallyBody, this.blockScope(scope), stmt.finallyBody);
          return;
        default:
          return;
      }
    }
    analyzeFunction(body, params, parent, key) {
      const inner = this.child(parent, "function");
      for (const param of params)
        this.declare(inner, param.name, "param", param);
      this.analyzeBody(body, inner, key);
    }
    nestExpr(expr, scope) {
      if (!expr)
        return;
      switch (expr.kind) {
        case "fn":
          this.analyzeFunction(expr.body, expr.params, scope, expr);
          return;
        case "unary":
          this.nestExpr(expr.expr, scope);
          return;
        case "binary":
          this.nestExpr(expr.left, scope);
          this.nestExpr(expr.right, scope);
          return;
        case "call":
        case "new":
          this.nestExpr(expr.callee, scope);
          for (const arg of expr.args)
            this.nestExpr(arg, scope);
          return;
        case "member":
          this.nestExpr(expr.object, scope);
          return;
        case "index":
          this.nestExpr(expr.object, scope);
          this.nestExpr(expr.index, scope);
          return;
        case "list":
          for (const item of expr.items)
            this.nestExpr(item, scope);
          return;
        case "record":
          for (const field of expr.fields)
            this.nestExpr(field.value, scope);
          return;
        case "super":
          for (const arg of expr.args)
            this.nestExpr(arg, scope);
          return;
        case "await":
          this.nestExpr(expr.expr, scope);
          return;
        case "template":
          for (const part of expr.parts) {
            if ("expr" in part)
              this.nestExpr(part.expr, scope);
          }
          return;
        default:
          return;
      }
    }
    declare(scope, name, kind, node) {
      if (scope.names.has(name))
        this.oops(node, `${name} is already declared`);
      scope.names.set(name, kind);
    }
    lookup(name) {
      return this.lookupFrom(this.scope, name);
    }
    lookupFrom(scope, name) {
      let current = scope;
      while (current) {
        const kind = current.names.get(name);
        if (kind)
          return { kind };
        current = current.parent;
      }
      return null;
    }
    child(parent, kind) {
      return { kind, names: /* @__PURE__ */ new Map(), parent };
    }
    blockScope(parent) {
      return { kind: "block", names: /* @__PURE__ */ new Map(), parent };
    }
    needScope(key, label) {
      const scope = this.scopes.get(key);
      if (!scope)
        throw new MagicError(`missing scope for ${label}`, 1, 1, this.filename);
      return scope;
    }
    saveFlags() {
      return {
        bindSelf: false,
        inheritSelf: true,
        allowSuper: this.allowSuper,
        superName: this.superName,
        selfExpr: this.selfExpr,
        canAwait: this.canAwait
      };
    }
    restoreFlags(flags) {
      this.allowSuper = flags.allowSuper;
      this.superName = flags.superName;
      this.selfExpr = flags.selfExpr;
      this.canAwait = flags.canAwait;
    }
    hasTopAwait(body) {
      return body.some((stmt) => this.stmtHasTopAwait(stmt));
    }
    stmtHasTopAwait(stmt) {
      switch (stmt.kind) {
        case "fn":
        case "class":
        case "import":
        case "break":
        case "continue":
          return false;
        case "let":
          return this.exprHasTopAwait(stmt.init);
        case "assign":
          return this.exprHasTopAwait(stmt.target) || this.exprHasTopAwait(stmt.value);
        case "print":
          return stmt.args.some((arg) => this.exprHasTopAwait(arg));
        case "expr":
          return this.exprHasTopAwait(stmt.expr);
        case "return":
          return this.exprHasTopAwait(stmt.value);
        case "throw":
          return this.exprHasTopAwait(stmt.value);
        case "if":
          if (stmt.arms.some((arm) => this.exprHasTopAwait(arm.test) || this.hasTopAwait(arm.body)))
            return true;
          return stmt.elseBody ? this.hasTopAwait(stmt.elseBody) : false;
        case "while":
          return this.exprHasTopAwait(stmt.test) || this.hasTopAwait(stmt.body);
        case "repeat":
          return this.hasTopAwait(stmt.body) || this.exprHasTopAwait(stmt.test);
        case "for":
          return this.exprHasTopAwait(stmt.from) || this.exprHasTopAwait(stmt.to) || this.exprHasTopAwait(stmt.step) || this.exprHasTopAwait(stmt.iter) || this.hasTopAwait(stmt.body);
        case "try":
          if (this.hasTopAwait(stmt.body))
            return true;
          if (stmt.catchBody && this.hasTopAwait(stmt.catchBody))
            return true;
          return stmt.finallyBody ? this.hasTopAwait(stmt.finallyBody) : false;
        default:
          return false;
      }
    }
    exprHasTopAwait(expr) {
      if (!expr)
        return false;
      switch (expr.kind) {
        case "await":
          return true;
        case "fn":
          return false;
        case "unary":
          return this.exprHasTopAwait(expr.expr);
        case "binary":
          return this.exprHasTopAwait(expr.left) || this.exprHasTopAwait(expr.right);
        case "call":
        case "new":
          return this.exprHasTopAwait(expr.callee) || expr.args.some((arg) => this.exprHasTopAwait(arg));
        case "member":
          return this.exprHasTopAwait(expr.object);
        case "index":
          return this.exprHasTopAwait(expr.object) || this.exprHasTopAwait(expr.index);
        case "list":
          return expr.items.some((item) => this.exprHasTopAwait(item));
        case "record":
          return expr.fields.some((field) => this.exprHasTopAwait(field.value));
        case "super":
          return expr.args.some((arg) => this.exprHasTopAwait(arg));
        case "template":
          return expr.parts.some((part) => "expr" in part && this.exprHasTopAwait(part.expr));
        default:
          return false;
      }
    }
    temp() {
      this.temps += 1;
      return `__magic_t${this.temps}`;
    }
    reset(filename) {
      this.w = new Writer();
      this.filename = filename;
      this.esm = false;
      this.bindings = [];
      this.scope = { kind: "module", names: /* @__PURE__ */ new Map(), parent: this.root };
      this.selfExpr = null;
      this.superName = null;
      this.allowSuper = false;
      this.loop = 0;
      this.fnDepth = 0;
      this.canAwait = true;
      this.temps = 0;
      this.readyClasses.clear();
      this.programKey = {};
      this.defaultMode = "none";
      this.mode = "none";
      this.guards = [];
    }
    checkModuleExports(program) {
      for (const stmt of importsOf(program)) {
        const info = moduleBySpecifier(stmt.specifier);
        if (!info || stmt.form !== "named")
          continue;
        for (const name of stmt.names) {
          if (!info.exports.includes(name.imported))
            this.oops(stmt, missingExport(info.name, name.imported));
        }
      }
    }
    runCheck(program) {
      this.mode = fileTypeMode(program, this.defaultMode);
      checkProgram(program, this.filename, this.mode);
    }
    oops(node, message) {
      throw new MagicError(message, node.line, node.column, this.filename);
    }
  };
  function compile(source, options) {
    return new Compiler().compile(source, options);
  }
  function defaultResolve(specifier) {
    const mod = moduleBySpecifier(specifier);
    if (mod)
      return mod.specifier;
    if (isMagicSpecifier(specifier)) {
      const withExt = specifier.endsWith(".magic") ? specifier : `${specifier}.magic`;
      return withExt.replace(/\.magic$/, ".js");
    }
    return specifier;
  }
  function importsOf(program) {
    return program.body.filter((stmt) => stmt.kind === "import");
  }
  function paramNames(params) {
    return params.map((param) => param.name).join(", ");
  }
  function builtinScope() {
    const names = /* @__PURE__ */ new Map();
    for (const name of BUILTIN_NAMES)
      names.set(name, "builtin");
    return { kind: "function", names, parent: null };
  }
  var Writer = class {
    lines = [];
    indent;
    constructor(indent = 0) {
      this.indent = indent;
    }
    line(text = "") {
      if (!text)
        this.lines.push("");
      else
        this.lines.push(`${"  ".repeat(this.indent)}${text}`);
    }
    push() {
      this.indent += 1;
    }
    pop() {
      this.indent = Math.max(0, this.indent - 1);
    }
    text() {
      return `${this.lines.join("\n")}
`;
    }
  };
  return __toCommonJS(browser_exports);
})();
globalThis.Magic = Magic;
globalThis.MAGIC = Magic;
