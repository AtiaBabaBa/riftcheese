"""Write cards/prices.json: the TCGplayer price of every Riftbound product, for the Portfolio tab.

TCGplayer's own API is closed to new developers, so this reads tcgcsv.com, which copies TCGplayer's
product list and market prices once a day (around 20:00 UTC). Browsers can't read tcgcsv.com from
another site, so the prices are saved next to the card list and served with the page.
.github/workflows/prices.yml runs this every day and commits the file when prices change.
Exchange rates (for showing values in baht and other currencies) come from open.er-api.com.
Run from the repository root:  python scripts/fetch_prices.py
"""
import json
import re
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

CATEGORY = 89  # Riftbound: League of Legends Trading Card Game on TCGplayer
BASE = f'https://tcgcsv.com/tcgplayer/{CATEGORY}'
CURRENCIES = ['THB', 'EUR', 'GBP', 'JPY', 'KRW', 'CNY', 'HKD', 'TWD', 'SGD', 'MYR', 'PHP', 'IDR', 'VND', 'AUD', 'CAD']
OUT = Path('cards/prices.json')
HEADERS = {'User-Agent': 'riftcheese-prices/1.0 (+https://github.com/AtiaBabaBa/riftcheese)'}


def get(url, as_json=True):
    with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=60) as r:
        return json.load(r) if as_json else r.read().decode().strip()


def card_key(name):
    # cardKey() in riftbound-prep.html, after dropping "(Alternate Art)", "(Signature)" and the like:
    # "Jinx, Loose Cannon (Signature)" -> "jinx - loose cannon", the key of that card in cards.json.
    s = re.sub(r'\s*\([^)]*\)', '', name)
    s = re.sub(r',\s+', ' - ', s).strip()
    return re.sub(r'\s+', ' ', s).lower()


def price(p):
    # TCGplayer's market price (recent sales), else the middle or lowest listing.
    for k in ('marketPrice', 'midPrice', 'lowPrice'):
        if p.get(k):
            return round(float(p[k]), 2)
    return None


def main():
    old = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {}
    known = {c['k'] for c in json.loads(Path('cards/cards.json').read_text(encoding='utf-8'))['cards']}

    groups = get(f'{BASE}/groups')['results']
    sets, products = {}, []
    for g in sorted(groups, key=lambda g: g.get('publishedOn') or ''):
        abbr = g.get('abbreviation') or str(g['groupId'])
        sets[abbr] = g['name']
        prices = {}
        for p in get(f'{BASE}/{g["groupId"]}/prices')['results']:
            v = price(p)
            if v is not None:
                prices.setdefault(p['productId'], {})['F' if p['subTypeName'] == 'Foil' else 'N'] = v
        for p in get(f'{BASE}/{g["groupId"]}/products')['results']:
            ext = {e['name']: e['value'] for e in p.get('extendedData') or []}
            row = {'id': p['productId'], 'n': p['name'].strip(), 's': abbr}
            if ext.get('Number'):
                row['no'] = ext['Number']
                if ext.get('Rarity'):
                    row['r'] = ext['Rarity']
                k = card_key(p['name'])
                if k in known:
                    row['k'] = k
            else:
                row['sealed'] = 1
            row.update(prices.get(p['productId'], {}))
            products.append(row)

    if len(products) < 500:
        sys.exit(f'Only {len(products)} products came back from tcgcsv.com; keeping the old prices.json.')

    try:
        rates = get('https://open.er-api.com/v6/latest/USD')['rates']
        fx = {c: rates[c] for c in CURRENCIES if c in rates}
    except Exception as e:  # keep yesterday's rates rather than fail the price update
        print(f'Exchange rates not updated: {e}')
        fx = old.get('fx', {})

    try:
        updated = get('https://tcgcsv.com/last-updated.txt', as_json=False)
    except Exception:
        updated = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S+0000')

    head = {'source': 'TCGplayer market prices via tcgcsv.com', 'updated': updated, 'currency': 'USD', 'fx': fx, 'sets': sets}
    # One product per line keeps the daily commits readable.
    body = ',\n'.join(json.dumps(p, ensure_ascii=False, separators=(',', ':')) for p in products)
    text = json.dumps(head, ensure_ascii=False)[:-1] + ',\n"products":[\n' + body + '\n]}\n'
    OUT.write_text(text, encoding='utf-8', newline='\n')
    priced = sum(1 for p in products if 'N' in p or 'F' in p)
    print(f'{OUT} written: {len(products)} products, {priced} with a price, prices from {updated}')


if __name__ == '__main__':
    main()
