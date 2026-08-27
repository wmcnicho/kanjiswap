"""Regenerates the KanjiSwap mark and every icon file that derives from it.

The mark is 漢字 caught mid-rotation inside a sweep arrow. The glyphs are real
outlines, not <text>, so the icon renders identically without the font present.
They are extracted from Noto Sans JP (SIL Open Font License 1.1), the same
family the app reads in, by way of the Google Fonts subsets that carry those two
characters.

    python3 tools/make_icon.py

Needs network (to fetch the two font subsets), fontTools, Pillow, and macOS
qlmanage for rasterizing. Nothing here runs as part of the app build — the
generated files in public/ and src/components/KanjiMark.jsx are committed.
"""

import json
import math
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.misc.transform import Transform
from fontTools.ttLib import TTFont
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / 'public'
CHARS = '漢字'
UA = ('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/120 Safari/537.36')

# Layout of the mark, in the 64-unit viewBox.
SIZE, GAP, TILT = 19.5, 3.0, -20
RADIUS, ARC_START, ARC_END, ARC_WIDTH = 28, 105, 325, 2.8
HEAD_AT, HEAD_SIZE = 332, 4.2
PAPER = (251, 250, 248)  # matches the app's background


def fetch_glyphs(workdir):
    """The SVG path of each character, scaled to a 1000-unit em and Y-flipped."""
    css = subprocess.run(
        ['curl', '-s', '-H', f'User-Agent: {UA}',
         'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@500'],
        capture_output=True, text=True, check=True).stdout

    wanted = {ord(character) for character in CHARS}
    paths = {}
    for block in css.split('@font-face'):
        url = re.search(r'url\((https://[^)]+)\)', block)
        ranges = re.search(r'unicode-range:\s*([^;]+);', block)
        if not url or not ranges:
            continue
        covered = set()
        for part in ranges.group(1).split(','):
            part = part.strip().removeprefix('U+')
            if '-' in part:
                low, high = part.split('-')
                covered.update(range(int(low, 16), int(high, 16) + 1))
            else:
                covered.add(int(part, 16))
        here = wanted & covered
        if not here:
            continue

        subset = workdir / f'subset-{len(paths)}.woff2'
        subprocess.run(['curl', '-sL', '-o', str(subset), url.group(1)], check=True)
        font = TTFont(subset)
        scale = 1000 / font['head'].unitsPerEm
        glyphs = font.getGlyphSet()
        for code in here:
            pen = SVGPathPen(glyphs)
            glyphs[font.getBestCmap()[code]].draw(
                TransformPen(pen, Transform(scale, 0, 0, -scale, 0, 0)))
            paths[chr(code)] = pen.getCommands()

    missing = set(CHARS) - paths.keys()
    if missing:
        raise SystemExit(f'no outline found for {"".join(missing)}')
    return paths


def mark_body(paths):
    """The mark itself: the rotated word, the sweep, and its arrowhead."""
    scale = SIZE / 1000
    offset = (SIZE + GAP) / 2
    word = ''.join(
        f'<g transform="translate({dx} 0) scale({scale}) translate(-500 440)">'
        f'<path d="{paths[character]}"/></g>'
        for character, dx in ((CHARS[0], -offset), (CHARS[1], offset)))
    word = f'<g transform="translate(32 32) rotate({TILT})">{word}</g>'

    start, end = math.radians(ARC_START), math.radians(ARC_END)
    x1, y1 = 32 + RADIUS * math.cos(start), 32 + RADIUS * math.sin(start)
    x2, y2 = 32 + RADIUS * math.cos(end), 32 + RADIUS * math.sin(end)
    large = 1 if abs(ARC_END - ARC_START) > 180 else 0
    sweep = (f'<path d="M {x1:.2f} {y1:.2f} A {RADIUS} {RADIUS} 0 {large} 1 {x2:.2f} {y2:.2f}" '
             f'fill="none" stroke="currentColor" stroke-width="{ARC_WIDTH}" stroke-linecap="round"/>')

    angle = math.radians(HEAD_AT)
    px, py = 32 + RADIUS * math.cos(angle), 32 + RADIUS * math.sin(angle)
    tangent = (-math.sin(angle), math.cos(angle))
    radial = (math.cos(angle), math.sin(angle))
    corners = [
        (px + tangent[0] * HEAD_SIZE * 1.2, py + tangent[1] * HEAD_SIZE * 1.2),
        (px - radial[0] * HEAD_SIZE * 0.72 - tangent[0] * HEAD_SIZE * 0.22,
         py - radial[1] * HEAD_SIZE * 0.72 - tangent[1] * HEAD_SIZE * 0.22),
        (px + radial[0] * HEAD_SIZE * 0.72 - tangent[0] * HEAD_SIZE * 0.22,
         py + radial[1] * HEAD_SIZE * 0.72 - tangent[1] * HEAD_SIZE * 0.22),
    ]
    head = '<polygon points="' + ' '.join(f'{x:.2f},{y:.2f}' for x, y in corners) + '"/>'
    return word + sweep + head


def favicon_svg(body):
    """Standalone favicon: no currentColor to inherit, so it states its own
    colours and follows the reader's light/dark setting."""
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 76 76" role="img" '
        'aria-label="KanjiSwap">'
        '<style>:root{color:#141312}@media (prefers-color-scheme:dark){:root{color:#f4f2ef}}</style>'
        f'<g fill="currentColor">{body}</g></svg>')


def rasterize(svg_path, size, workdir):
    subprocess.run(['qlmanage', '-t', '-s', str(size), '-o', str(workdir), str(svg_path)],
                   capture_output=True, check=True)
    rendered = workdir / f'{svg_path.name}.png'
    if not rendered.exists():
        raise SystemExit(f'qlmanage produced nothing for {svg_path}')
    return Image.open(rendered).convert('RGBA')


def on_paper(image, size):
    canvas = Image.new('RGBA', (size, size), PAPER + (255,))
    canvas.alpha_composite(image.resize((size, size), Image.LANCZOS))
    return canvas.convert('RGB')


def main():
    with tempfile.TemporaryDirectory() as tmp:
        workdir = Path(tmp)
        paths = fetch_glyphs(workdir)
        body = mark_body(paths)

        (PUBLIC / 'icon.svg').write_text(favicon_svg(body))
        print('wrote public/icon.svg')

        source = workdir / 'render.svg'
        source.write_text(favicon_svg(body).replace('#f4f2ef', '#141312'))  # always dark ink
        large = rasterize(source, 1024, workdir)

        for name, size in (('icon-192.png', 192), ('icon-512.png', 512), ('apple-touch-icon.png', 180)):
            on_paper(large, size).save(PUBLIC / name)
            print(f'wrote public/{name}')

        flat = on_paper(large, 64)
        flat.save(PUBLIC / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])
        print('wrote public/favicon.ico')

        # SVG attribute names have to be spelled the way JSX wants them.
        jsx_body = body.replace('stroke-width=', 'strokeWidth=').replace('stroke-linecap=', 'strokeLinecap=')

        component = ROOT / 'src' / 'components' / 'KanjiMark.jsx'
        component.write_text(
            "import React from 'react';\n\n"
            "// 漢字 caught mid-rotation. Generated by tools/make_icon.py — the glyphs are\n"
            "// real outlines from Noto Sans JP (OFL 1.1), so the mark needs no font loaded\n"
            "// and inherits its colour from the text around it.\n"
            "function KanjiMark({ size = 28, ...props }) {\n"
            "  return (\n"
            "    <svg\n"
            "      viewBox='-6 -6 76 76'\n"
            "      width={size}\n"
            "      height={size}\n"
            "      fill='currentColor'\n"
            "      role='img'\n"
            "      aria-label='KanjiSwap'\n"
            "      {...props}\n"
            "    >\n"
            f"      {jsx_body}\n"
            "    </svg>\n"
            "  );\n"
            "}\n\n"
            "export default KanjiMark;\n"
        )
        print('wrote src/components/KanjiMark.jsx')


if __name__ == '__main__':
    main()
