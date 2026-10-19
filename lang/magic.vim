" Vim syntax for MAGIC
" Put this file in ~/.vim/syntax/magic.vim
" and add to ~/.vim/filetype.vim:
"   au BufRead,BufNewFile *.magic set filetype=magic

if exists("b:current_syntax")
  finish
endif

syn case ignore
syn keyword magicKeyword import from use class fn end if then else elseif for while repeat until return break continue let print and or not true false nil new self super try catch finally throw await
syn keyword magicSoft do to step in as is mod async public private protected
syn match magicComment "--.*$"
syn match magicRemark "^\s*REM\b.*$"
syn match magicAnnotation "@[A-Za-z_][A-Za-z0-9_]*\|@[23][Dd]"
syn region magicInterp matchgroup=magicString start='{' end='}' contained contains=magicString,magicNumber,magicKeyword
syn region magicString start='\$"""' end='"""' contains=magicInterp,magicEscape
syn region magicString start='\$"' end='"' skip='\\.' contains=magicInterp,magicEscape
syn region magicString start="\$'" end="'" skip="\\." contains=magicInterp,magicEscape
syn region magicString start='"""' end='"""' contains=magicEscape
syn region magicString start='"' end='"' skip='\\.' contains=magicEscape
syn region magicString start="'" end="'" skip="\\." contains=magicEscape
syn match magicEscape "\\%(\\[nrt0\\'\"]\|\\u\x\{4}\|\\u{\x\{1,6}}\)" contained
syn match magicNumber "\v<\d+(\.\d+)?([eE][+-]?\d+)?>"

hi def link magicKeyword Keyword
hi def link magicSoft Identifier
hi def link magicComment Comment
hi def link magicRemark Comment
hi def link magicAnnotation PreProc
hi def link magicString String
hi def link magicEscape SpecialChar
hi def link magicNumber Number

let b:current_syntax = "magic"
syn case match
