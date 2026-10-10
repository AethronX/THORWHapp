/** @jest-environment node */
import { AppController } from '../src/state/appController';
import { CATEGORY_KEYS, contrast, dark, light, oklab, Palette, Scale } from '../src/ui/theme';
import { SqlJsDriver } from './helpers/sqlJsDriver';

const AA_TEXT = 4.5;
const AA_UI = 3; // WCAG 1.4.11 non-text contrast

function textPairs(p: Palette): [string, string, string][] {
  const surfaces: [string, string][] = [
    ['background', p.background],
    ['surface', p.surface],
    ['surfaceMuted', p.surfaceMuted],
  ];
  const texts: [string, string][] = [
    ['onSurface', p.onSurface],
    ['onSurfaceMuted', p.onSurfaceMuted],
    ['textSubtle', p.textSubtle],
    ['primary', p.primary],
    ['accentText', p.accentText],
    ['positive', p.positive],
    ['warning', p.warning],
    ['negative', p.negative],
    ['info', p.info],
    ['income', p.income],
    ['expense', p.expense],
  ];
  const out: [string, string, string][] = [];
  for (const [tn, t] of texts) for (const [sn, sv] of surfaces) out.push([`${tn} on ${sn}`, t, sv]);
  out.push(
    ['onPrimary on primary', p.onPrimary, p.primary],
    ['onPrimary on primaryPressed', p.onPrimary, p.primaryPressed],
    ['onPrimaryContainer on primaryContainer', p.onPrimaryContainer, p.primaryContainer],
    ['primary on primaryContainer', p.primary, p.primaryContainer],
    ['accentText on accentContainer', p.accentText, p.accentContainer],
    ['positive on positiveContainer', p.positive, p.positiveContainer],
    ['warning on warningContainer', p.warning, p.warningContainer],
    ['negative on negativeContainer', p.negative, p.negativeContainer],
    ['info on infoContainer', p.info, p.infoContainer],
    ['onNegative on negative', p.onNegative, p.negative],
    ['onHero on hero', p.onHero, p.hero],
    ['onHeroMuted on hero', p.onHeroMuted, p.hero],
    ['heroAccent on hero', p.heroAccent, p.hero],
  );
  for (const k of CATEGORY_KEYS) {
    const c = p.categories[k];
    out.push([`category ${k} fg on its bg`, c.fg, c.bg], [`category ${k} fg on surface`, c.fg, p.surface]);
  }
  return out;
}

for (const [name, p] of [
  ['light', light],
  ['dark', dark],
] as const) {
  describe(`${name} palette`, () => {
    test('every value is a #RRGGBB colour', () => {
      const values: string[] = [];
      for (const [k, v] of Object.entries(p)) {
        if (k === 'categories') for (const t of Object.values(v as Palette['categories'])) values.push(t.fg, t.bg);
        else if (typeof v === 'string') values.push(v);
      }
      for (const v of values) expect(v).toMatch(/^#[0-9A-F]{6}$/);
    });

    test.each(textPairs(p))(`text: %s >= 4.5:1`, (_label, fg, bg) => {
      expect(contrast(fg, bg)).toBeGreaterThanOrEqual(AA_TEXT);
    });

    test.each([
      ['input border on surface', p.borderStrong, p.surface],
      ['input border on background', p.borderStrong, p.background],
      ['focus ring on surface', p.focus, p.surface],
      ['filled button on background', p.primary, p.background],
      ['gold accent on surface', p.accent, p.surface],
      ['brand gold on the deep-green hero', p.brandGold, p.hero],
      ['progress bar on its track', p.progress, p.surfaceMuted],
      ['progress bar on surface', p.progress, p.surface],
    ])(`UI boundary: %s >= 3:1`, (_label, fg, bg) => {
      expect(contrast(fg, bg)).toBeGreaterThanOrEqual(AA_UI);
    });

    test('category colours are mutually distinguishable (OKLab ΔE >= 0.05)', () => {
      let min = Infinity;
      for (let i = 0; i < CATEGORY_KEYS.length; i++) {
        for (let j = i + 1; j < CATEGORY_KEYS.length; j++) {
          const a = oklab(p.categories[CATEGORY_KEYS[i]].fg);
          const b = oklab(p.categories[CATEGORY_KEYS[j]].fg);
          min = Math.min(min, Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));
        }
      }
      expect(min).toBeGreaterThanOrEqual(0.05);
    });

    test('ordinary spending is never shown in the error colour', () => {
      expect(p.expense).not.toBe(p.negative);
      expect(p.income).not.toBe(p.negative);
    });
  });
}

test('primitive scales get darker step by step (perceptual lightness)', () => {
  for (const [name, scale] of Object.entries(Scale)) {
    const steps = Object.keys(scale).map(Number).sort((a, b) => a - b);
    const L = steps.map((s) => oklab((scale as Record<number, string>)[s])[0]);
    for (let i = 1; i < L.length; i++) expect({ name, step: steps[i], darker: L[i] < L[i - 1] }).toEqual({ name, step: steps[i], darker: true });
  }
});

test('rule: step 600+ of every hue is AA text on white', () => {
  for (const scale of Object.values(Scale)) {
    for (const [step, hex] of Object.entries(scale)) {
      if (Number(step) >= 600) expect(contrast(hex, '#FFFFFF')).toBeGreaterThanOrEqual(AA_TEXT);
    }
  }
});

test('light theme is the default for new and existing users', async () => {
  const app = new AppController(new SqlJsDriver());
  await app.init();
  expect(app.getState().themeMode).toBe('light');
  await app.dispose();
});
