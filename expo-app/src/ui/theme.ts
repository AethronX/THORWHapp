/**
 * Tharwati Design System — "Emerald & Frankincense"
 * ==================================================
 * Single source of truth for colour, type, spacing, shape, elevation and
 * motion. Rationale and usage rules: docs/DESIGN_SYSTEM.md.
 *
 * Every colour below was generated in OKLCH (perceptually uniform), then
 * verified: text pairs >= 4.5:1, UI boundaries >= 3:1 (WCAG 2.2 AA), and
 * category colours mutually distinguishable. __tests__/designSystem.test.ts
 * re-checks all of it, so a token change that breaks a rule fails CI.
 *
 * LIGHT is the default theme (owner decision, D-020). Dark is optional.
 */
import type { TextStyle } from 'react-native';

import { CATEGORY_KEYS, type CategoryKey } from '../domain/models';

// -----------------------------------------------------------------------------
// 1. Primitive scales (OKLCH lightness steps 50 = lightest … 950 = darkest).
//    Rule that holds for every hue: step >= 600 is AA text on white.
//    Components never use primitives directly — only semantic tokens (§2).
// -----------------------------------------------------------------------------
export const Scale = {
  /** Brand. Deep Omani green: growth, stability, trust. */
  emerald: { 50: '#EAFCF4', 100: '#D8F5E8', 200: '#B7E8D3', 300: '#8AD3B7', 400: '#57B695', 500: '#219976', 600: '#027C5D', 700: '#056249', 800: '#024936', 900: '#023124', 950: '#011E15' },
  /** Accent. Frankincense / khanjar gold: value, achievement. Used sparingly. */
  gold: { 50: '#FEF6E8', 100: '#F9EBD4', 200: '#EFD7B0', 300: '#DDBC83', 400: '#C39A51', 500: '#A77A20', 600: '#896103', 700: '#6C4C04', 800: '#513801', 900: '#372501', 950: '#231600' },
  /** Warm neutral (desert sand) for canvas and dividers. */
  sand: { 50: '#F7F7F5', 100: '#EEECEA', 200: '#DDDAD6', 300: '#C4C0BB', 400: '#A5A19A', 500: '#87827B', 600: '#6C6861', 700: '#56524C', 800: '#403D38', 900: '#2B2925', 950: '#1A1815' },
  /** Text neutral with a trace of brand green (never pure black). */
  ink: { 50: '#F6F7F6', 100: '#EBEDEC', 200: '#D8DBDA', 300: '#BEC2C0', 400: '#9EA3A0', 500: '#7F8582', 600: '#656A68', 700: '#4F5451', 800: '#3A3E3C', 900: '#272A28', 950: '#171918' },
  ruby: { 50: '#FEF4F3', 100: '#FEE7E4', 300: '#FFA59E', 600: '#B13937', 700: '#922526', 950: '#350204' },
  amber: { 50: '#FEF5ED', 100: '#FFE8D4', 300: '#F1B274', 600: '#955905', 700: '#764503', 950: '#271300' },
  leaf: { 50: '#ECFCEF', 100: '#DBF5DF', 300: '#95D2A1', 600: '#207D3F', 700: '#09642D', 950: '#001F09' },
  sea: { 50: '#F0F8FE', 100: '#DFEFFE', 300: '#96C7F1', 500: '#4389C1', 600: '#286EA2', 700: '#155785', 950: '#001A2F' },
} as const;

// -----------------------------------------------------------------------------
// 2. Semantic tokens. Screens and components use ONLY these names.
// -----------------------------------------------------------------------------
export { CATEGORY_KEYS } from '../domain/models';
export type { CategoryKey } from '../domain/models';

export interface CategoryTone {
  /** Icon / label colour (AA on `bg` and on surface). */
  fg: string;
  /** Tinted chip / icon-badge background. */
  bg: string;
}

export interface Palette {
  dark: boolean;

  // Surfaces — ivory canvas, white cards: calm, paper-like, premium.
  /** App canvas behind cards. */
  background: string;
  /** Cards, sheets, inputs. */
  surface: string;
  /** Recessed areas: disclaimers, progress tracks, segmented controls. */
  surfaceMuted: string;
  /** Signature hero (monthly summary): deep emerald. */
  hero: string;
  onHero: string;
  onHeroMuted: string;
  /** Gold detail on the hero (hairline, small labels). */
  heroAccent: string;
  /** Brand gold #D4AF57 — decoration only: on the deep-green hero or as large marks, never body text. */
  brandGold: string;
  /** Progress bars and rings (non-text, >= 3:1). */
  progress: string;
  /** Budget bar near its limit / over it (non-text, >= 3:1). */
  cautionBar: string;
  dangerBar: string;

  // Text
  onSurface: string;
  /** Secondary text (labels, metadata). */
  onSurfaceMuted: string;
  /** Tertiary text and placeholders — still AA. */
  textSubtle: string;

  // Lines
  /** Hairline dividers and card borders (decorative). */
  outline: string;
  /** Input and control boundaries (>= 3:1, WCAG 1.4.11). */
  borderStrong: string;
  /** Keyboard / accessibility focus ring. */
  focus: string;

  // Brand
  primary: string;
  onPrimary: string;
  primaryPressed: string;
  primaryContainer: string;
  onPrimaryContainer: string;

  // Accent (gold): achievements, reached goals, premium moments only.
  accent: string;
  accentText: string;
  accentContainer: string;

  // Status. Always paired with an icon or words — never colour alone.
  positive: string;
  positiveContainer: string;
  warning: string;
  warningContainer: string;
  negative: string;
  negativeContainer: string;
  onNegative: string;
  info: string;
  infoContainer: string;

  // Money semantics (D-021): income is green; ordinary spending is NOT red.
  // Red is reserved for over-budget and negative cash flow.
  income: string;
  expense: string;

  categories: Record<CategoryKey, CategoryTone>;
}

const S = Scale;

export const light: Palette = {
  dark: false,
  background: '#F7F5EF', // brand ivory
  surface: '#FFFFFF',
  surfaceMuted: '#EFEBE2',
  hero: '#0F513F', // brand deep green
  onHero: '#FFFFFF',
  onHeroMuted: S.emerald[100],
  heroAccent: '#D6B35F', // brand gold, a hair lighter for 4.6:1 text on the hero
  brandGold: '#D4AF57',
  progress: '#2E7D68', // brand mid green
  cautionBar: '#A86F12', // golden amber, 3.6:1 on the track
  dangerBar: '#C94F4F', // brand red (non-text use, 3.7:1)

  onSurface: S.ink[900],
  onSurfaceMuted: S.ink[700],
  textSubtle: '#626976', // brand grey #6B7280 darkened for 4.5:1 on ivory

  outline: S.sand[200],
  borderStrong: S.sand[500],
  focus: S.sea[500],

  primary: '#0F513F', // brand deep green
  onPrimary: '#FFFFFF',
  primaryPressed: '#0B3D2F',
  primaryContainer: '#E4EFEA',
  onPrimaryContainer: '#0B3D2F',

  accent: S.gold[500],
  accentText: S.gold[700],
  accentContainer: S.gold[50],

  positive: '#2B7461', // brand mid green #2E7D68, a hair darker for 4.5:1 text on every surface
  positiveContainer: S.leaf[50],
  warning: S.amber[700],
  warningContainer: S.amber[50],
  negative: '#B14646', // brand red #C94F4F darkened for 4.5:1 text
  negativeContainer: S.ruby[50],
  onNegative: '#FFFFFF',
  info: S.sea[700],
  infoContainer: S.sea[50],

  income: '#2B7461',
  expense: S.ink[900],

  categories: {
    // One family (OKLCH L 0.50, C 0.12, hues 30° apart; housing on the brand emerald hue), so charts
    // read as Tharwati rather than a generic chart library. Text >= 4.76:1, ΔE >= 0.051.
    housing: { fg: '#007852', bg: '#E2F6EC' },
    food: { fg: '#8A5700', bg: '#FAEEDE' },
    transport: { fg: '#007096', bg: '#DFF4FD' },
    utilities: { fg: '#994920', bg: '#FFEBE3' },
    telecom: { fg: '#2E64A6', bg: '#E5F1FF' },
    health: { fg: '#9B424D', bg: '#FFEAEB' },
    education: { fg: '#007778', bg: '#DEF6F5' },
    family: { fg: '#914373', bg: '#FDEAF4' },
    shopping: { fg: '#7D4B92', bg: '#F7EBFC' },
    entertainment: { fg: '#5D57A4', bg: '#EEEEFF' },
    debt: { fg: '#6E6600', bg: '#F2F1DE' },
    other: { fg: '#65635E', bg: '#F2F0EC' },
  },
};

export const dark: Palette = {
  dark: true,
  background: '#0D1210',
  surface: '#161B18',
  surfaceMuted: '#1F2422',
  hero: '#0F513F',
  onHero: '#FFFFFF',
  onHeroMuted: S.emerald[100],
  heroAccent: S.gold[300],
  brandGold: '#D4AF57',
  progress: S.emerald[300],
  cautionBar: S.amber[300],
  dangerBar: S.ruby[300],

  onSurface: S.ink[50],
  onSurfaceMuted: S.ink[300],
  textSubtle: S.ink[400],

  outline: '#313734',
  borderStrong: '#6C7370',
  focus: S.sea[300],

  primary: S.emerald[300],
  onPrimary: S.emerald[950],
  primaryPressed: S.emerald[200],
  primaryContainer: S.emerald[900],
  onPrimaryContainer: S.emerald[100],

  accent: S.gold[400],
  accentText: S.gold[300],
  accentContainer: '#2A2110',

  positive: S.leaf[300],
  positiveContainer: '#0F2414',
  warning: S.amber[300],
  warningContainer: '#2A1C0C',
  negative: S.ruby[300],
  negativeContainer: '#2E1514',
  onNegative: S.ruby[950],
  info: S.sea[300],
  infoContainer: '#0F2131',

  income: S.leaf[300],
  expense: S.ink[50],

  categories: {
    housing: { fg: '#74D0AA', bg: '#183026' },
    food: { fg: '#E2B16B', bg: '#342816' },
    transport: { fg: '#67C9ED', bg: '#152E37' },
    utilities: { fg: '#F3A582', bg: '#39251B' },
    telecom: { fg: '#8CBEFD', bg: '#1E2B3B' },
    health: { fg: '#F69EA5', bg: '#3A2324' },
    education: { fg: '#5BD0CF', bg: '#12302F' },
    family: { fg: '#EB9FCA', bg: '#37232E' },
    shopping: { fg: '#D4A6E9', bg: '#312536' },
    entertainment: { fg: '#B3B1FC', bg: '#28283B' },
    debt: { fg: '#C4BF6C', bg: '#2D2B16' },
    other: { fg: '#BCBAB5', bg: '#2B2A27' },
  },
};

/** Tone for a category: built-ins by key; custom ones by their icon slot. */
export function categoryTone(p: Palette, key: string | null, iconCode: number): CategoryTone {
  const k = (key && (CATEGORY_KEYS as readonly string[]).includes(key) ? key : CATEGORY_KEYS[iconCode]) as CategoryKey | undefined;
  return p.categories[k ?? 'other'];
}

// -----------------------------------------------------------------------------
// 3. Typography — IBM Plex Sans Arabic (Arabic + Latin, one family).
//    Arabic letterforms need more vertical room than Latin: body line-height
//    is 1.6×, headings 1.4×. Base 15/24 on a 1.2 modular scale. Money uses
//    tabular figures so columns of amounts align.
// -----------------------------------------------------------------------------
export const Fonts = {
  regular: 'IBMPlexSansArabic-Regular',
  medium: 'IBMPlexSansArabic-Medium',
  bold: 'IBMPlexSansArabic-Bold',
} as const;

const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

export const Type = {
  /** Hero amounts (left-over this month). */
  display: { fontFamily: Fonts.bold, fontSize: 32, lineHeight: 44, ...tabular },
  /** Screen titles. */
  headline: { fontFamily: Fonts.bold, fontSize: 24, lineHeight: 34 },
  /** Card titles, onboarding titles. */
  title: { fontFamily: Fonts.bold, fontSize: 20, lineHeight: 30 },
  /** Emphasised rows, buttons, amounts in lists. */
  subtitle: { fontFamily: Fonts.medium, fontSize: 16, lineHeight: 26 },
  /** Default reading text. */
  body: { fontFamily: Fonts.regular, fontSize: 15, lineHeight: 24 },
  /** Metadata, helper and error text. */
  small: { fontFamily: Fonts.regular, fontSize: 13, lineHeight: 20 },
  /** Field labels, chips, tab labels. */
  label: { fontFamily: Fonts.medium, fontSize: 13, lineHeight: 20 },
  /** Amount in a list row. */
  amount: { fontFamily: Fonts.bold, fontSize: 16, lineHeight: 24, ...tabular },
} satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof Type;

// -----------------------------------------------------------------------------
// 4. Space (4-pt grid), shape, touch.
// -----------------------------------------------------------------------------
export const Space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48, gutter: 20 } as const;

/** Soft, not bubbly: generous radii read as premium but stay serious. */
export const Radii = { xs: 6, sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;

/** Minimum interactive target (Material 48dp; WCAG 2.5.8). */
export const MIN_TAP = 48;

// -----------------------------------------------------------------------------
// 5. Elevation. Luxury = restraint: hairlines first, shadows barely there and
//    tinted with the brand ink (never grey-black smudges).
// -----------------------------------------------------------------------------
export const Elevation = {
  /** Cards on the canvas. */
  raised: { shadowColor: '#023124', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  /** Floating action button, sheets. */
  overlay: { shadowColor: '#023124', shadowOpacity: 0.14, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
} as const;

// -----------------------------------------------------------------------------
// 6. Motion. Short and calm; respect the OS "reduce motion" setting.
// -----------------------------------------------------------------------------
export const Motion = { fast: 120, base: 200, slow: 320 } as const;

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------

/** WCAG 2.x contrast ratio between two #RRGGBB colours. */
export function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const ch = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    return 0.2126 * ch(c[0]) + 0.7152 * ch(c[1]) + 0.0722 * ch(c[2]);
  };
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Colour in OKLab — used to check that category colours are distinguishable. */
export function oklab(hex: string): [number, number, number] {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  const [r, g, b] = c;
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

// -----------------------------------------------------------------------------
// Spending-calendar heat levels (0 = none … 4 = most). Alphas chosen so day
// numbers keep 4.5:1 on every level in both themes (tested).
// -----------------------------------------------------------------------------
const HEAT_ALPHA = (p: Palette) => ['00', '26', '55', p.dark ? 'AA' : '88', 'FF'];
/** Fill for heat level 0..4 (primary at increasing opacity). */
export const heatFill = (p: Palette, level: number) => (level <= 0 ? 'transparent' : level >= 4 ? p.primary : p.primary + HEAT_ALPHA(p)[level]);
/** Opacity (0..1) of a heat level, for contrast checks. */
export const heatOpacity = (p: Palette, level: number) => parseInt(HEAT_ALPHA(p)[Math.max(0, Math.min(4, level))], 16) / 255;
/** Text colour for a day number drawn on a heat level. */
export const heatText = (p: Palette, level: number) => (level >= 4 || (level === 3 && p.dark) ? p.onPrimary : p.onSurface);
