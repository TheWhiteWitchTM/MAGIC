import type { Token } from './token.js';
/** Words that always mean structure. Matched without regard to case. */
export declare const KEYWORDS: Set<string>;
/**
 * Turns Magic source into tokens. A newline is a token, because a new line
 * ends a statement the way it does in BASIC. `--` and a leading `REM` are comments.
 */
export declare class Lexer {
    private readonly source;
    private readonly filename;
    private i;
    private line;
    private column;
    private atLineStart;
    constructor(source: string, filename?: string, line?: number, column?: number);
    tokenize(): Token[];
    private one;
    private string;
    /** `"""` may span lines. A newline right after the opening quotes is dropped. */
    private longString;
    /**
     * `$"..."` and `$"""..."""`. `{expr}` is a hole. `{{` and `}}` are braces.
     * The parser reads each hole as an expression.
     */
    private template;
    private hole;
    /** Skip a string inside an interpolation so its braces stay part of the text. */
    private skipQuoted;
    private atTriple;
    private dropLeadingBreak;
    private escape;
    private unicode;
    private number;
    private ident;
    private operator;
    private startsRemark;
    private skipRemark;
    private skipToLineEnd;
    private skipSpaces;
    private newline;
    private match;
    private bump;
    private char;
    private code;
    private codeAt;
    private done;
    private isDigit;
    private isHex;
    private isIdentStart;
    private isIdentPart;
    private fail;
}
