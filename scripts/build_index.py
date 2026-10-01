"""Build index.html (a standalone page for GitHub Pages) from riftbound-prep.html.

riftbound-prep.html is written for Claude artifacts, which wrap it in a document
skeleton. This adds that skeleton: doctype, head (title, fonts, styles) and body.
Run from the repository root:  python scripts/build_index.py
"""
from pathlib import Path

src = Path('riftbound-prep.html').read_text(encoding='utf-8')
cut = src.index('</style>') + len('</style>')
head, body = src[:cut], src[cut:]
reset = ('<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);'
         'padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}'
         '[hidden]{display:none!important}</style>')
page = ('<!doctype html>\n<html lang="en">\n<head>\n' + head.strip() + '\n' + reset +
        '\n</head>\n<body>\n' + body.strip() + '\n</body>\n</html>\n')
Path('index.html').write_text(page, encoding='utf-8', newline='\n')
print(f'index.html written ({len(page):,} bytes)')
