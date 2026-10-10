import sys
sys.path.insert(0, '.')
from geom import CONTOURS
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.recordingPen import RecordingPen
import pathops

HEIGHT = 720          # glyph height in font units (bottom of lower bar → top of hook)
X0, Y0, Y1 = 115, 40, 985
S = HEIGHT / (Y1 - Y0)
SB = 40               # side bearing
T = lambda p: ((p[0] - X0) * S + SB, (Y1 - p[1]) * S)

# Union of the four shapes (bars, hook, tail) into clean outlines.
path = pathops.Path()
for c in CONTOURS:
    pen = path.getPen()
    for seg in c:
        if seg[0] == 'M': pen.moveTo(T(seg[1]))
        elif seg[0] == 'L': pen.lineTo(T(seg[1]))
        else: pen.curveTo(T(seg[1]), T(seg[2]), T(seg[3]))
    pen.closePath()
path.simplify(fix_winding=True)
rec = RecordingPen(); path.draw(rec)

xs = [pt[0] for _, pts in rec.value for pt in pts]
adv = round(max(xs) + SB)

tt = TTGlyphPen(None)
rec.replay(Cu2QuPen(tt, max_err=0.8, reverse_direction=True))
glyph = tt.glyph()

nd = TTGlyphPen(None); nd.moveTo((50, 0)); nd.lineTo((50, 700)); nd.lineTo((450, 700)); nd.lineTo((450, 0)); nd.closePath()

fb = FontBuilder(1000, isTTF=True)
fb.setupGlyphOrder(['.notdef', 'uni20C4'])
fb.setupCharacterMap({0x20C4: 'uni20C4'})
fb.setupGlyf({'.notdef': nd.glyph(), 'uni20C4': glyph})
fb.setupHorizontalMetrics({'.notdef': (500, 50), 'uni20C4': (adv, SB)})
fb.setupHorizontalHeader(ascent=900, descent=-100)
fb.setupNameTable({'familyName': 'CurrencyOMR', 'styleName': 'Regular', 'uniqueFontIdentifier': 'Tharwati:CurrencyOMR-Regular',
                   'fullName': 'CurrencyOMR Regular', 'psName': 'CurrencyOMR-Regular', 'version': 'Version 1.000',
                   'copyright': 'Omani rial sign (U+20C4), redrawn for Tharwati from the published Central Bank of Oman symbol.'})
fb.setupOS2(sTypoAscender=900, sTypoDescender=-100, usWinAscent=990, usWinDescent=100, sTypoLineGap=0)
fb.setupPost()
fb.save(sys.argv[1])
print('advance', adv, 'contours', len([1 for op, _ in rec.value if op == 'closePath']))
