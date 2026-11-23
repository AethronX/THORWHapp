#!/usr/bin/env python3
"""
Cuts the bundled IBM Plex Sans Arabic faces down to the characters an Arabic
money app can actually show, keeping every OpenType layout table Arabic needs
to join letters (D-049).

What is kept, and why each range matters:
  Latin + Latin-1   merchant names typed in English ("LULU"), the EN locale
  Arabic blocks     the whole blocks, not just the words in i18n.ts — the user
                    types their own category names and notes, so coverage must
                    stay complete for Arabic
  punctuation       LRM/RLM (amount wrapping), the bullet, dashes, ellipsis
  currency          currency symbols that live in this font

Run:  python3 scripts/font-subset/subset.py            (writes in place)
      python3 scripts/font-subset/subset.py --check    (verifies only)
Needs fonttools. The originals stay in git history; OFL.txt still applies and
subsetting is allowed by it (the name must not change, and it does not).
"""
import subprocess, sys, pathlib

FONTS = ['IBMPlexSansArabic_400Regular', 'IBMPlexSansArabic_500Medium', 'IBMPlexSansArabic_700Bold']
DIR = pathlib.Path(__file__).resolve().parents[2] / 'assets' / 'fonts'
UNICODES = ','.join([
    'U+0000-00FF',              # Latin, Latin-1
    'U+0600-06FF', 'U+0750-077F', 'U+08A0-08FF',   # Arabic, Supplement, Extended-A
    'U+FB50-FDFF', 'U+FE70-FEFF',                  # Arabic presentation forms
    'U+2000-206F',              # spaces, LRM/RLM, dashes, bullet, ellipsis
    'U+20A0-20CF',              # currency symbols
    'U+2190-21FF',              # arrows (→ ⇒ ← ↑ ↓) used in text and comments
    'U+2212', 'U+2248', 'U+2260', 'U+2264', 'U+2265', 'U+00D7',   # − ≈ ≠ ≤ ≥ ×
    'U+2713', 'U+2717',         # ✓ ✗
])
# Arabic is unreadable without these: joining forms, ligatures, mark placement.
FEATURES = 'init,medi,fina,isol,rlig,liga,calt,ccmp,mark,mkmk,curs,kern,locl,dnom,numr,frac,ss01,aalt'

def subset(src: pathlib.Path, dst: pathlib.Path) -> None:
    subprocess.run([sys.executable, '-m', 'fontTools.subset', str(src),
                    f'--unicodes={UNICODES}', f'--layout-features={FEATURES}',
                    '--notdef-glyph', '--notdef-outline', '--recommended-glyphs',
                    # Keep the OFL notice, family and style names; drop the rest.
                    '--name-IDs=0,1,2,3,4,5,6,13,14',
                    # Glyph names (the `post` table) cost ~18 KB a face and nothing renders them.
                    '--no-glyph-names',
                    f'--output-file={dst}'], check=True)

def main() -> int:
    check = '--check' in sys.argv
    total_before = total_after = 0
    for name in FONTS:
        src = DIR / f'{name}.ttf'
        dst = DIR / f'{name}.subset.ttf'
        subset(src, dst)
        before, after = src.stat().st_size, dst.stat().st_size
        total_before += before
        total_after += after
        print(f'{name}: {before // 1024} KB -> {after // 1024} KB')
        if check:
            dst.unlink()
        else:
            dst.replace(src)
    print(f'total: {total_before // 1024} KB -> {total_after // 1024} KB '
          f'({100 - round(total_after * 100 / total_before)}% smaller)')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
