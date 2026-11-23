#!/usr/bin/env python3
"""
Proves the subset fonts still cover the app and still shape Arabic (D-049).

Checks, per face:
  1. every visible character inside a STRING LITERAL in src/ is in the font's
     cmap (a missing one would render as an empty box in the UI). Comments are
     skipped on purpose: a sign used only to explain code is never drawn;
  2. the whole Arabic block U+0621-U+064A is covered, because users type
     their own category names and notes;
  3. the OpenType features Arabic needs to join letters are still present;
  4. the OFL notice is still in the name table.
Run: python3 scripts/font-subset/verify.py
"""
import pathlib, re, sys
from fontTools.ttLib import TTFont

ROOT = pathlib.Path(__file__).resolve().parents[2]
FONTS = sorted((ROOT / 'assets' / 'fonts').glob('IBMPlexSansArabic_*.ttf'))
# 'isol' is absent from IBM Plex itself (isolated forms are the default glyphs).
NEEDED_FEATURES = {'init', 'medi', 'fina', 'mark', 'ccmp', 'rlig'}
# Characters the UI composes itself that may not appear literally in the source.
EXTRA = set('0123456789٠١٢٣٤٥٦٧٨٩\u00a0·—–…%+-/:,.()[]')
# Invisible format characters (LRM, RLM, BOM, the isolate marks) and the new
# currency signs are not glyphs here: the text engine places the first, and the
# bundled currency fonts carry the second. The original IBM Plex has no glyph for
# either, so their absence is not something subsetting caused.
IGNORE = {0x200E, 0x200F, 0xFEFF, 0x2066, 0x2067, 0x2068, 0x2069, 0x20C1, 0x20C3, 0x20C4}

def main() -> int:
    literal = re.compile(r"'([^'\\\n]|\\.)*'|\"([^\"\\\n]|\\.)*\"|`([^`\\]|\\.)*`", re.S)
    wanted = set(EXTRA)
    for path in (ROOT / 'src').rglob('*.ts*'):
        for m in literal.finditer(path.read_text(encoding='utf-8')):
            wanted |= {c for c in m.group(0) if ord(c) > 0x1f}
    wanted = {c for c in wanted if ord(c) not in IGNORE}
    arabic = {chr(c) for c in range(0x621, 0x64B)}
    bad = 0
    for path in FONTS:
        f = TTFont(path)
        cmap = set(f.getBestCmap())
        missing = {c for c in wanted | arabic if ord(c) not in cmap}
        feats = {r.FeatureTag for t in ('GSUB', 'GPOS') if t in f for r in f[t].table.FeatureList.FeatureRecord}
        lost = NEEDED_FEATURES - feats
        names = ' '.join(n.toUnicode() for n in f['name'].names)
        ofl = 'SIL Open Font License' in names or 'OFL' in names
        size = path.stat().st_size // 1024
        ok = not missing and not lost and ofl
        print(f'{path.name}: {size} KB · {len(cmap)} characters · '
              f'{"shaping ok" if not lost else "MISSING FEATURES " + ",".join(sorted(lost))} · '
              f'{"OFL kept" if ofl else "OFL NOTICE LOST"}'
              + (f' · MISSING {"".join(sorted(missing))!r}' if missing else ''))
        bad += 0 if ok else 1
    return bad

if __name__ == '__main__':
    raise SystemExit(main())
