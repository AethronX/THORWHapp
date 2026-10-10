import { ReactNode } from 'react';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { addMonths } from '../core/dates';
import { toArabicDigits } from '../core/digits';
import { useAppState, useController, useUi } from './AppContext';
import { categoryIcon, CURRENCY_SIGN_FONTS, formatMonth } from './format';
import { PressScale, useCountUp } from './motion';
import { IconName, PhIcon } from './icons';
import type { Category } from '../domain/models';
import { useState } from 'react';

import { categoryTone, Elevation, Fonts, MIN_TAP, Radii, Space, Type, TypeVariant } from './theme';

export type { IconName } from './icons';

// -- text ---------------------------------------------------------------------

type Variant = TypeVariant;

/**
 * Text that follows the UI direction (right-aligned in Arabic) regardless of
 * the device language, so the layout is correct in Expo Go too.
 */
export function T({
  children,
  variant = 'body',
  color,
  muted,
  center,
  style,
  testID,
  numberOfLines,
}: {
  children: ReactNode;
  variant?: Variant;
  color?: string;
  muted?: boolean;
  center?: boolean;
  style?: StyleProp<TextStyle>;
  testID?: string;
  numberOfLines?: number;
}) {
  const { p, rtl, arabicDigits, say } = useUi();
  // Screen readers don't know the new currency characters yet: speak their names.
  const spoken = typeof children === 'string' && SIGN_RE.test(children) ? say(children) : undefined;
  return (
    <Text
      testID={testID}
      accessibilityLabel={spoken}
      numberOfLines={numberOfLines}
      maxFontSizeMultiplier={2}
      style={[
        Type[variant],
        {
          color: color ?? (muted ? p.onSurfaceMuted : p.onSurface),
          textAlign: center ? 'center' : rtl ? 'right' : 'left',
          writingDirection: rtl ? 'rtl' : 'ltr',
        },
        style,
      ]}
    >
      {withCurrencySigns(arabicDigits ? withArabicDigits(children) : children, variant === 'body' || variant === 'small' ? 'regular' : 'bold')}
    </Text>
  );
}

/** Draw new currency signs (U+20C1 / U+20C3) with their bundled font; system fonts don't have them yet. */
const SIGN_RE = new RegExp(`([${Object.keys(CURRENCY_SIGN_FONTS).join('')}])`);
function withCurrencySigns(c: ReactNode, weight: 'regular' | 'bold'): ReactNode {
  if (typeof c === 'string') {
    if (!SIGN_RE.test(c)) return c;
    return c.split(SIGN_RE).map((part, i) =>
      CURRENCY_SIGN_FONTS[part] ? (
        <Text key={i} style={{ fontFamily: CURRENCY_SIGN_FONTS[part][weight] }}>
          {part}
        </Text>
      ) : (
        part
      ),
    );
  }
  if (Array.isArray(c)) return c.map((x) => withCurrencySigns(x, weight));
  return c;
}

function withArabicDigits(c: ReactNode): ReactNode {
  if (typeof c === 'string') return toArabicDigits(c);
  if (typeof c === 'number') return toArabicDigits(String(c));
  if (Array.isArray(c)) return c.map(withArabicDigits);
  return c;
}

/** App icon (Phosphor duotone by default); mirrors directional icons in RTL. */
export function Icon({ name, size = 22, color, weight }: { name: IconName; size?: number; color?: string; weight?: 'duotone' | 'regular' }) {
  const { p, rtl } = useUi();
  return <PhIcon name={name} size={size} color={color ?? p.onSurface} weight={weight} rtl={rtl} />;
}

// -- layout -------------------------------------------------------------------

/** Scrollable screen body with the standard gutter. */
export function Screen({ children, testID }: { children: ReactNode; testID?: string }) {
  const { p } = useUi();
  return (
    <ScrollView
      testID={testID}
      style={{ backgroundColor: p.background }}
      contentContainerStyle={{ padding: Space.gutter, paddingBottom: 120, gap: Space.lg }}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function Row({ children, style, gap = Space.sm, testID }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number; testID?: string }) {
  return <View testID={testID} style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Card({
  title,
  action,
  children,
  style,
  testID,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { p } = useUi();
  return (
    <View
      testID={testID}
      style={[
        { backgroundColor: p.surface, borderRadius: Radii.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: p.outline, padding: Space.lg, gap: Space.md, ...(p.dark ? null : Elevation.raised) },
        style,
      ]}
    >
      {title != null && (
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }} accessibilityRole="header">
            <T variant="subtitle">{title}</T>
          </View>
          {action}
        </Row>
      )}
      {children}
    </View>
  );
}

// -- buttons ------------------------------------------------------------------

type ButtonKind = 'filled' | 'tonal' | 'outlined' | 'text' | 'danger';

export function Button({
  label,
  onPress,
  kind = 'filled',
  icon,
  disabled,
  testID,
  style,
}: {
  label: string;
  onPress: () => void;
  kind?: ButtonKind;
  icon?: IconName;
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { p } = useUi();
  const bg = { filled: p.primary, tonal: p.primaryContainer, outlined: 'transparent', text: 'transparent', danger: 'transparent' }[kind];
  const fg = { filled: p.onPrimary, tonal: p.onPrimaryContainer, outlined: p.primary, text: p.primary, danger: p.negative }[kind];
  const border = kind === 'outlined' ? p.primary : kind === 'danger' ? p.negative : 'transparent';
  const labelStyle = { fontFamily: Fonts.medium };
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: MIN_TAP,
          paddingHorizontal: Space.xl,
          borderRadius: Radii.md,
          backgroundColor: kind === 'filled' && pressed ? p.primaryPressed : bg,
          borderWidth: kind === 'outlined' || kind === 'danger' ? 1 : 0,
          borderColor: border,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: Space.sm,
          opacity: disabled ? 0.45 : pressed && kind !== 'filled' ? 0.7 : 1,
        },
        style,
      ]}
    >
      {icon && <Icon name={icon} size={20} color={fg} />}
      <T variant="subtitle" color={fg} center style={labelStyle}>
        {label}
      </T>
    </Pressable>
  );
}

export function IconButton({ icon, label, onPress, disabled, testID }: { icon: IconName; label: string; onPress: () => void; disabled?: boolean; testID?: string }) {
  const { p } = useUi();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({ width: MIN_TAP, height: MIN_TAP, alignItems: 'center', justifyContent: 'center', borderRadius: Radii.pill, opacity: disabled ? 0.35 : pressed ? 0.6 : 1 })}
    >
      <Icon name={icon} color={p.onSurface} />
    </Pressable>
  );
}

function liquidGlass(): boolean {
  try {
    return Platform.OS === 'ios' && isLiquidGlassAvailable();
  } catch {
    return false;
  }
}

/**
 * Floating action button pinned to the bottom "end" corner. On iOS 26+ it is
 * an emerald-tinted Liquid Glass control — Apple's guidance: glass for
 * controls floating above content, never for the content itself. Elsewhere a
 * solid emerald button.
 */
export function Fab({ label, onPress, testID }: { label: string; onPress: () => void; testID?: string }) {
  const { p } = useUi();
  if (liquidGlass()) {
    return (
      <View pointerEvents="box-none" style={{ position: 'absolute', bottom: Space.lg, end: Space.lg }}>
        <PressScale testID={testID} accessibilityRole="button" accessibilityLabel={label} onPress={onPress}>
          <GlassView
            glassEffectStyle="regular"
            tintColor={p.primary}
            isInteractive
            style={{ minHeight: MIN_TAP + 4, paddingHorizontal: Space.xl, borderRadius: Radii.pill, flexDirection: 'row', alignItems: 'center', gap: Space.sm }}
          >
            <Icon name="add" size={20} color={p.onPrimary} />
            <T variant="subtitle" color={p.onPrimary} style={{ fontFamily: Fonts.medium }}>
              {label}
            </T>
          </GlassView>
        </PressScale>
      </View>
    );
  }
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', bottom: Space.lg, end: Space.lg }}>
      <Button label={label} icon="add" onPress={onPress} testID={testID} style={{ borderRadius: Radii.lg, ...Elevation.overlay }} />
    </View>
  );
}

/** An amount that counts up to its new value (static with Reduce Motion). */
export function AnimatedAmount({ minor, variant = 'display', color, testID }: { minor: number; variant?: Variant; color?: string; testID?: string }) {
  const { money } = useUi();
  const shown = useCountUp(minor);
  return (
    <T variant={variant} color={color} testID={testID}>
      {money(shown)}
    </T>
  );
}

// -- inputs -------------------------------------------------------------------

export function Field({
  label,
  error,
  hint,
  suffix,
  ltr,
  ...props
}: TextInputProps & { label: string; error?: string | null; hint?: string; suffix?: string; ltr?: boolean }) {
  const { p, rtl } = useUi();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: Space.xs }}>
      <T variant="label" color={p.onSurfaceMuted}>
        {label}
      </T>
      <Row
        style={{
          borderWidth: error || focused ? 2 : 1,
          borderColor: error ? p.negative : focused ? p.primary : p.borderStrong,
          borderRadius: Radii.md,
          backgroundColor: p.surface,
          paddingHorizontal: Space.md,
          minHeight: MIN_TAP,
        }}
      >
        <TextInput
          keyboardAppearance={p.dark ? 'dark' : 'light'}
          selectionColor={p.primary}
          accessibilityLabel={label}
          placeholder={hint}
          placeholderTextColor={p.textSubtle}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          maxFontSizeMultiplier={2}
          style={{
            flex: 1,
            // Lets the input shrink so a suffix (currency) stays inside the box.
            minWidth: 0,
            color: p.onSurface,
            fontFamily: Fonts.regular,
            fontSize: 16,
            paddingVertical: Space.sm,
            textAlign: rtl ? 'right' : 'left',
            // Numbers are typed left-to-right even in Arabic.
            writingDirection: ltr ? 'ltr' : rtl ? 'rtl' : 'ltr',
            ...(ltr ? { fontVariant: ['tabular-nums'] as const } : null),
          }}
          {...props}
        />
        {suffix ? (
          <T variant="label" color={p.textSubtle}>
            {suffix}
          </T>
        ) : null}
      </Row>
      {error ? (
        <T variant="small" color={p.negative} testID={props.testID ? `${props.testID}.error` : undefined}>
          {error}
        </T>
      ) : null}
    </View>
  );
}

// -- feedback & status --------------------------------------------------------

/** Progress bar that always states its value in text (never colour alone). */
export function LabeledProgress({ value, label, trailing, budget = false }: { value: number; label: string; trailing?: string; budget?: boolean }) {
  const { p, s, say } = useUi();
  const over = budget && value > 1;
  const near = budget && !over && value >= 0.8;
  const color = over ? p.dangerBar : near ? p.cautionBar : p.progress;
  // Long trailing text (e.g. "350.000 ر.ع. من 360.000 ر.ع.") goes on its own line so amounts never break mid-way.
  const stacked = (trailing?.length ?? 0) > 16;
  const trailingText = trailing ? (
    <T variant="small" color={over ? p.negative : p.onSurfaceMuted}>
      {trailing}
    </T>
  ) : null;
  return (
    <View accessible accessibilityLabel={say([label, trailing].filter(Boolean).join(s.listSep))} style={{ gap: Space.xs }}>
      <Row style={{ alignItems: 'flex-start' }}>
        {over && <Icon name="warning" size={18} color={p.negative} />}
        <View style={{ flex: 1 }}>
          <T>{label}</T>
          {stacked && trailingText}
        </View>
        {!stacked && trailingText && <View style={{ flexShrink: 0 }}>{trailingText}</View>}
      </Row>
      <View style={{ height: 8, borderRadius: Radii.pill, backgroundColor: p.surfaceMuted, overflow: 'hidden' }}>
        <View style={{ height: 8, width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`, backgroundColor: color }} />
      </View>
    </View>
  );
}

/** "Label ..... value" that wraps the value below at large text sizes. */
export function TotalRow({ label, value, testID }: { label: string; value: string; testID?: string }) {
  const { say } = useUi();
  return (
    <View accessible accessibilityLabel={say(`${label}: ${value}`)} testID={testID} style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: Space.sm }}>
      <T>{label}</T>
      <T variant="subtitle" style={{ fontFamily: Fonts.bold }}>
        {value}
      </T>
    </View>
  );
}

/** Empty list/state: icon, what's missing, and (ideally) the action that fills it. `compact` inside cards. */
export function EmptyState({ icon, title, body, action, compact = false, testID }: { icon: IconName; title: string; body?: string; action?: ReactNode; compact?: boolean; testID?: string }) {
  const { p } = useUi();
  const size = compact ? 48 : 64;
  return (
    <View testID={testID} style={{ alignItems: 'center', padding: compact ? Space.md : Space.xxl, gap: compact ? Space.sm : Space.md }}>
      <View importantForAccessibility="no-hide-descendants" style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: p.primaryContainer, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={size / 2} color={p.onPrimaryContainer} />
      </View>
      <T variant={compact ? 'body' : 'subtitle'} center>
        {title}
      </T>
      {body ? (
        <T muted center>
          {body}
        </T>
      ) : null}
      {action}
    </View>
  );
}

export function Loading() {
  const { p } = useUi();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: p.background }}>
      <ActivityIndicator color={p.primary} size="large" />
    </View>
  );
}

/** ‹ October 2026 › — arrows follow the reading direction. */
export function MonthSwitcher() {
  const st = useAppState();
  const c = useController();
  const { s, rtl } = useUi();
  const isCurrent = st.month.year === st.today.year && st.month.month === st.today.month;
  return (
    <Row style={{ justifyContent: 'center' }}>
      <IconButton testID="month.prev" icon="back" label={s.prevMonth} onPress={() => runGuarded(() => c.setMonth(addMonths(st.month, -1)), s.errLoad)} />
      <View style={{ flexShrink: 1 }}>
        <T variant="subtitle" center testID="month.label">
          {formatMonth(st.month, st.locale)}
        </T>
      </View>
      <IconButton testID="month.next" icon="forward" label={s.nextMonth} disabled={isCurrent} onPress={() => runGuarded(() => c.setMonth(addMonths(st.month, 1)), s.errLoad)} />
    </Row>
  );
}

// -- dialogs & guarded actions -------------------------------------------------

export function confirm(opts: { title: string; body?: string; confirmLabel: string; cancelLabel: string; destructive?: boolean }): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      opts.title,
      opts.body,
      [
        { text: opts.cancelLabel, style: 'cancel', onPress: () => resolve(false) },
        { text: opts.confirmLabel, style: opts.destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

/**
 * Runs a mutation; on failure shows a generic message. The error payload is
 * never logged (it may contain amounts). Returns true on success.
 */
export async function runGuarded(op: () => Promise<unknown>, errorText: string): Promise<boolean> {
  try {
    await op();
    return true;
  } catch {
    Alert.alert(errorText);
    return false;
  }
}

/** Category icon in its own tinted badge (colour + icon, never colour alone). */
export function CategoryBadge({ category, size = 40 }: { category: Category | undefined; size?: number }) {
  const { p } = useUi();
  const tone = categoryTone(p, category?.key ?? null, category?.iconCode ?? 11);
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, borderRadius: Radii.sm, backgroundColor: tone.bg, alignItems: 'center', justifyContent: 'center' }}
    >
      <Icon name={category ? categoryIcon(category) : 'catOther'} size={Math.round(size * 0.55)} color={tone.fg} />
    </View>
  );
}

/** Brand switch: emerald when on, clear track when off, white thumb on Android (iOS draws its own). */
export function Toggle({ value, onValueChange, testID, accessibilityLabel }: { value: boolean; onValueChange: (v: boolean) => void; testID?: string; accessibilityLabel?: string }) {
  const { p } = useUi();
  return (
    <Switch
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      value={value}
      onValueChange={onValueChange}
      trackColor={{ true: p.primary, false: p.borderStrong }}
      ios_backgroundColor={p.borderStrong}
      thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
    />
  );
}

// -- shared panels ----------------------------------------------------------------

/** Brand hero panel (deep green, gold rule) — the same look on every screen that opens with a summary. */
export function HeroPanel({ children, testID }: { children: ReactNode; testID?: string }) {
  const { p } = useUi();
  return (
    <View testID={testID} style={{ backgroundColor: p.hero, borderRadius: Radii.lg, padding: Space.xl, gap: Space.sm, overflow: 'hidden', ...Elevation.raised }}>
      <View style={{ position: 'absolute', top: 0, start: Space.xl, end: Space.xl, height: 2, backgroundColor: p.brandGold, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 }} />
      {children}
    </View>
  );
}

export type Status = 'good' | 'opportunity' | 'needsData';
const STATUS_ICONS: Record<Status, IconName> = { good: 'success', opportunity: 'tip', needsData: 'info' };

/** Status pill (icon + word, never colour alone) used by principles and investing readiness. */
export function StatusChip({ status, testID }: { status: Status; testID?: string }) {
  const { p, s } = useUi();
  const color = status === 'good' ? p.positive : status === 'opportunity' ? p.warning : p.textSubtle;
  return (
    <Row gap={Space.xs} style={{ borderWidth: 1, borderColor: color, borderRadius: Radii.pill, paddingHorizontal: Space.sm, paddingVertical: Space.xxs }}>
      <Icon name={STATUS_ICONS[status]} size={14} color={color} />
      <T variant="small" color={color} testID={testID}>
        {s.principleStatus[status]}
      </T>
    </Row>
  );
}

/** Shown by current-month tools (principles, investing) while a past month is being viewed. */
export function CurrentMonthOnly() {
  const st = useAppState();
  const c = useController();
  const { s } = useUi();
  return (
    <Card testID="currentMonthOnly">
      <T>{s.currentMonthOnly(formatMonth(st.month, st.locale))}</T>
      <Button label={s.goToCurrentMonth} onPress={() => runGuarded(() => c.setMonth({ year: st.today.year, month: st.today.month }), s.errLoad)} testID="currentMonthOnly.go" />
    </Card>
  );
}
