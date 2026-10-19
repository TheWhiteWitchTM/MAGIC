export type TokenKind = 'eof' | 'newline' | 'ident' | 'number' | 'string' | 'template' | 'keyword' | 'op';
/** A piece of a `$"..."` template. Holes are source text the parser reads as expressions. */
export type TemplatePiece = {
    kind: 'text';
    value: string;
} | {
    kind: 'hole';
    source: string;
    line: number;
    column: number;
};
export interface Token {
    kind: TokenKind;
    /** Keyword text is lower case. Identifiers keep their spelling. Strings are decoded. */
    value: string;
    line: number;
    column: number;
    /** Set for a template. Text is decoded. A hole is the source between `{` and `}`. */
    parts?: TemplatePiece[];
}
