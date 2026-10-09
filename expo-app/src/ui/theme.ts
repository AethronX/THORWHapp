/**
 * Design tokens: the single source of colour, spacing, radius and type.
 * Components must use these rather than literals. Every text/background pair
 * is checked for WCAG AA (>= 4.5:1) in __tests__/ui.test.tsx.
 */
export const Space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, gutter: 16 } as const;
export const Radii = { sm: 8, md: 12, lg: 16, pill: 999 } as const;
/** Minimum interactive target (Material / WCAG 2.5.8). */
export const MIN_TAP = 48;

export const Fonts = {
  regular: 'IBMPlexSansArabic-Regular',
  medium: 'IBMPlexSansArabic-Medium',
  bold: 'IBMPlexSansArabic-Bold',
} as const;

export interface Palette {
  dark: boolean;
  /** Brand: deep teal — calm, trustworthy. */
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  /** Muted gold, highlights only (never body text). */
  accent: string;
  background: string;
  surface: string;
  surfaceMuted: string;
  onSurface: string;
  onSurfaceMuted: string;
  outline: string;
  /** Semantic states — always paired with an icon or text. */
  positive: string;
  warning: string;
  negative: string;
  onNegative: string;
}

export const light: Palette = {
  dark: false,
  primary: '#0B5D51',
  onPrimary: '#FFFFFF',
  primaryContainer: '#D3EEE7',
  onPrimaryContainer: '#00201B',
  accent: '#B8892B',
  background: '#F6F7F5',
  surface: '#FFFFFF',
  surfaceMuted: '#EDF1EF',
  onSurface: '#17201E',
  onSurfaceMuted: '#4B5754',
  outline: '#C7D0CD',
  positive: '#1B6E40',
  warning: '#8A5200',
  negative: '#B3261E',
  onNegative: '#FFFFFF',
};

export const dark: Palette = {
  dark: true,
  primary: '#7BD5C3',
  onPrimary: '#00382F',
  primaryContainer: '#0E4A41',
  onPrimaryContainer: '#D3EEE7',
  accent: '#E2BD6B',
  background: '#0F1413',
  surface: '#182120',
  surfaceMuted: '#212B29',
  onSurface: '#E2E8E6',
  onSurfaceMuted: '#A8B4B1',
  outline: '#3B4744',
  positive: '#7FD9A3',
  warning: '#F2C46D',
  negative: '#FFB4AB',
  onNegative: '#690005',
};

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
