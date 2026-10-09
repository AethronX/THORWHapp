/**
 * Lightweight charts drawn with react-native-svg (bundled in Expo Go).
 * Rules (dataviz best practice + docs/DESIGN_SYSTEM.md):
 * - Every chart has a text equivalent (accessibilityLabel + visible legend
 *   with values) — colour is never the only carrier of meaning.
 * - Thin gaps between donut slices so adjacent colours never touch.
 * - Bars start at zero; no 3-D, no gradients, no decoration.
 */
import { View } from 'react-native';
import Svg, { Circle, G, Line, Rect } from 'react-native-svg';

import { useUi } from './AppContext';
import { T } from './components';
import { Radii, Space } from './theme';

// -----------------------------------------------------------------------------
// Donut
// -----------------------------------------------------------------------------

export function Donut({
  slices,
  size = 168,
  thickness = 22,
  label,
  centerTop,
  centerBottom,
  testID,
}: {
  slices: { value: number; color: string }[];
  size?: number;
  thickness?: number;
  /** Full text description for screen readers. */
  label: string;
  centerTop?: string;
  centerBottom?: string;
  testID?: string;
}) {
  const { p } = useUi();
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const total = slices.reduce((a, s) => a + s.value, 0);
  const gap = slices.length > 1 ? 2.5 : 0; // px of circumference between slices
  let offset = 0;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} testID={testID} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={p.surfaceMuted} strokeWidth={thickness} fill="none" />
          {total > 0 &&
            slices.map((s, i) => {
              const len = (s.value / total) * c;
              const dash = Math.max(0, len - gap);
              const el = (
                <Circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  stroke={s.color}
                  strokeWidth={thickness}
                  fill="none"
                  strokeDasharray={`${dash} ${c - dash}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                />
              );
              offset += len;
              return el;
            })}
        </G>
      </Svg>
      {centerTop ? (
        <T variant="small" muted center>
          {centerTop}
        </T>
      ) : null}
      {centerBottom ? (
        <T variant="amount" center>
          {centerBottom}
        </T>
      ) : null}
    </View>
  );
}

// -----------------------------------------------------------------------------
// Score ring (0..100)
// -----------------------------------------------------------------------------

export function ScoreRing({ score, color, size = 112, label }: { score: number; color: string; size?: number; label: string }) {
  const { p } = useUi();
  const thickness = 10;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const len = (Math.min(100, Math.max(0, score)) / 100) * c;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={p.surfaceMuted} strokeWidth={thickness} fill="none" />
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={thickness} fill="none" strokeDasharray={`${len} ${c - len}`} strokeLinecap="round" />
        </G>
      </Svg>
      <T variant="headline" center>
        {String(score)}
      </T>
    </View>
  );
}

// -----------------------------------------------------------------------------
// Grouped bars: income vs expenses per month
// -----------------------------------------------------------------------------

export function PairedBars({
  data,
  colorA,
  colorB,
  height = 140,
  label,
  testID,
}: {
  /** Oldest first. In RTL the chart reads right-to-left like the text. */
  data: { label: string; a: number; b: number; highlight?: boolean }[];
  colorA: string;
  colorB: string;
  height?: number;
  label: string;
  testID?: string;
}) {
  const { p, rtl } = useUi();
  const max = Math.max(1, ...data.flatMap((d) => [d.a, d.b]));
  const barW = 10;
  const groupGap = 4;
  const ordered = rtl ? [...data].reverse() : data;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} testID={testID} style={{ gap: Space.xs }}>
      <View style={{ height, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        {ordered.map((d, i) => (
          <View key={i} style={{ alignItems: 'center', flex: 1 }}>
            <Svg width={barW * 2 + groupGap} height={height}>
              <Line x1={0} x2={barW * 2 + groupGap} y1={height - 0.5} y2={height - 0.5} stroke={p.outline} strokeWidth={1} />
              <Rect x={0} y={height - (d.a / max) * height} width={barW} height={(d.a / max) * height} rx={3} fill={colorA} opacity={d.highlight ? 1 : 0.55} />
              <Rect x={barW + groupGap} y={height - (d.b / max) * height} width={barW} height={(d.b / max) * height} rx={3} fill={colorB} opacity={d.highlight ? 1 : 0.55} />
            </Svg>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {ordered.map((d, i) => (
          <View key={i} style={{ flex: 1 }}>
            <T variant="small" muted={!d.highlight} center>
              {d.label}
            </T>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Legend row: swatch + label + value (+ optional share bar). */
export function LegendRow({ color, label, value, share }: { color: string; label: string; value: string; share?: number }) {
  const { p } = useUi();
  return (
    <View style={{ gap: Space.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Space.sm }}>
        <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
        <View style={{ flex: 1 }}>
          <T>{label}</T>
        </View>
        <T variant="amount">{value}</T>
      </View>
      {share != null && (
        <View style={{ height: 4, borderRadius: Radii.pill, backgroundColor: p.surfaceMuted, overflow: 'hidden' }}>
          <View style={{ width: `${Math.round(share * 100)}%`, height: 4, backgroundColor: color }} />
        </View>
      )}
    </View>
  );
}
