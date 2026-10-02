"""Build index.html (a standalone page for GitHub Pages) from riftbound-prep.html.

riftbound-prep.html is written for Claude artifacts, which wrap it in a document
skeleton. This adds that skeleton: doctype, head (title, fonts, styles) and body.
When ADS_CONFIG in the page has an AdSense publisher id, the AdSense tags go in the
head (Google checks for them when reviewing the site) and ads.txt is written.
Run from the repository root:  python scripts/build_index.py
"""
import re
from pathlib import Path

src = Path('riftbound-prep.html').read_text(encoding='utf-8')
cut = src.index('</style>') + len('</style>')
head, body = src[:cut], src[cut:]
reset = ('<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);'
         'padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}'
         '[hidden]{display:none!important}</style>')

ads = ''
m = re.search(r"const ADS_CONFIG = \{\s*client:\s*'([^']*)'", src)
client = m.group(1).strip() if m else ''
if client:
    if not re.fullmatch(r'ca-pub-\d+', client):
        raise SystemExit(f'ADS_CONFIG.client should look like ca-pub-1234567890123456, not {client!r}')
    ads = (f'\n<meta name="google-adsense-account" content="{client}">'
           f'\n<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={client}" crossorigin="anonymous"></script>')
    Path('ads.txt').write_text(f'google.com, {client[3:]}, DIRECT, f08c47fec0942fa0\n', encoding='utf-8', newline='\n')
    print('ads.txt written')

page = ('<!doctype html>\n<html lang="en">\n<head>\n' + head.strip() + '\n' + reset + ads +
        '\n</head>\n<body>\n' + body.strip() + '\n</body>\n</html>\n')
Path('index.html').write_text(page, encoding='utf-8', newline='\n')
print(f'index.html written ({len(page):,} bytes)' + (' with AdSense' if client else ''))
