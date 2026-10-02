"""Draw the app icons in icons/ (home-screen icons for the installable app).

The artwork is the header logo: a teal hexagon with a gold rune, on the dark theme's
background. Run from the repository root:  python scripts/make_icons.py  (needs Pillow)
"""
from pathlib import Path
from PIL import Image, ImageDraw

BG, TEAL, GOLD = (16, 19, 26), (70, 195, 199), (217, 168, 76)
SS = 4  # supersampling for smooth edges

def icon(size, logo, radius=0.0):
    """logo: share of the icon's width the 32-unit logo box takes; radius: corner rounding (share of size)."""
    S = size * SS
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((0, 0, S - 1, S - 1), radius=int(S * radius), fill=BG)
    u = S * logo / 32  # one logo unit in pixels
    o = (S - 32 * u) / 2
    p = lambda x, y: (o + x * u, o + y * u)
    hexagon = [p(16, 2), p(28, 9), p(28, 23), p(16, 30), p(4, 23), p(4, 9), p(16, 2), p(28, 9)]
    d.line(hexagon, fill=TEAL, width=round(2.2 * u), joint='curve')
    w = round(1.9 * u)
    for line in ([p(16, 8), p(16, 24)], [p(10, 12), p(16, 16), p(22, 12)], [p(10, 20), p(16, 16), p(22, 20)]):
        d.line(line, fill=GOLD, width=w, joint='curve')
        for x, y in (line[0], line[-1]):  # round caps
            d.ellipse((x - w / 2, y - w / 2, x + w / 2, y + w / 2), fill=GOLD)
    return img.resize((size, size), Image.LANCZOS)

out = Path('icons')
out.mkdir(exist_ok=True)
icon(192, 0.78, 0.22).save(out / 'icon-192.png', optimize=True)
icon(512, 0.78, 0.22).save(out / 'icon-512.png', optimize=True)
# Maskable: Android crops to a circle or squircle, so the logo stays inside the middle 80%.
icon(512, 0.58).save(out / 'maskable-512.png', optimize=True)
# iOS rounds the corners itself and shows transparency as black, so this one is a full square.
icon(180, 0.7).convert('RGB').save(out / 'apple-touch-icon.png', optimize=True)
print('icons written to', out)
