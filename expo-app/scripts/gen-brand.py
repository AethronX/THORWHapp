#!/usr/bin/env python3
"""Generate the app icon, Android adaptive layers, splash and favicon.

Mark: an Omani arch (fort window / doorway) with three gold bars rising
inside it — saving that grows, with a local identity. Deliberately avoids
letterforms (an earlier «ث» mark resembled an existing Omani payment app).

Usage (from expo-app/):  python3 scripts/gen-brand.py [path-to-headless-chrome]
Writes SVG sources and PNGs to assets/brand/. PNG rendering needs a headless
Chromium; without one, only the SVGs are written.
"""
import os
import subprocess
import sys
import tempfile

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'brand')
CHROME = sys.argv[1] if len(sys.argv) > 1 else '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell'

IVORY = '#FBF5E9'
DEFS = '''<defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#146650"/>
      <stop offset="1" stop-color="#0A3A2D"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.38" r="0.6">
      <stop offset="0" stop-color="#219976" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#219976" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#F0D59A"/>
      <stop offset="1" stop-color="#B98A32"/>
    </linearGradient>
  </defs>'''
BG = '<rect width="1024" height="1024" fill="url(#bg)"/><rect width="1024" height="1024" fill="url(#glow)"/>'


def mark(scale: float, ink: str, bars: str) -> str:
    return f'''<g transform="translate(512 512) scale({scale}) translate(-512 -505)">
    <!-- Omani arch: slightly pointed, open at the base, standing on a ground line -->
    <path d="M332 760 V488 C332 372 418 300 512 258 C606 300 692 372 692 488 V760"
          fill="none" stroke="{ink}" stroke-width="52" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M262 760 H762" stroke="{ink}" stroke-width="52" stroke-linecap="round"/>
    <!-- three rising bars: saving that grows -->
    <rect x="388" y="604" width="64" height="104" rx="18" fill="{bars}"/>
    <rect x="480" y="530" width="64" height="178" rx="18" fill="{bars}"/>
    <rect x="572" y="452" width="64" height="256" rx="18" fill="{bars}"/>
  </g>'''


def svg(body: str, size: int = 1024) -> str:
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="{size}" height="{size}">
  {DEFS}
  {body}
</svg>
'''


# name -> (svg, pixel size, transparent?)
ASSETS = {
    'icon': (svg(BG + mark(1.0, IVORY, 'url(#gold)')), 1024, False),
    # Adaptive icon: the launcher masks to ~66% — keep the mark inside the safe zone.
    'adaptive-fg': (svg(mark(0.66, IVORY, 'url(#gold)')), 1024, True),
    'adaptive-bg': (svg(BG), 1024, False),
    'monochrome': (svg(mark(0.66, '#FFFFFF', '#FFFFFF')), 1024, True),
    'splash': (svg(mark(0.9, IVORY, 'url(#gold)')), 1024, True),
    'favicon': (svg(BG + mark(1.08, IVORY, 'url(#gold)'), 48), 48, False),
}


def render(src: str, png: str, size: int, transparent: bool) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        html = os.path.join(tmp, 'page.html')
        with open(html, 'w') as f:
            f.write(f'<html><body style="margin:0"><img src="file://{os.path.abspath(src)}" width="{size}" height="{size}"></body></html>')
        cmd = [CHROME, '--no-sandbox', '--hide-scrollbars', f'--window-size={size},{size}', f'--screenshot={os.path.abspath(png)}']
        if transparent:
            cmd.append('--default-background-color=00000000')
        subprocess.run(cmd + [f'file://{html}'], check=True, capture_output=True)


def main() -> None:
    have_chrome = os.path.exists(CHROME)
    for name, (text, size, transparent) in ASSETS.items():
        src = os.path.join(OUT, f'{name}.svg')
        with open(src, 'w') as f:
            f.write(text)
        if have_chrome:
            render(src, os.path.join(OUT, f'{name}.png'), size, transparent)
    print('wrote', ', '.join(ASSETS), '' if have_chrome else '(SVG only: no headless Chromium)')


if __name__ == '__main__':
    main()
