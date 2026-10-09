import { ReactNode } from 'react';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
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
import { useAppState, useController, useUi } from './AppContext';
import { categoryIcon, formatMonth } from './format';
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
  const { p, rtl } = useUi();
  return (
    <Text
      testID={testID}
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
      {children}
    </Text>
  );
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
  const { p } = useUi();
  const over = budget && value > 1;
  const near = budget && !over && value >= 0.8;
  const color = over ? p.negative : near ? p.warning : p.primary;
  return (
    <View accessible accessibilityLabel={[label, trailing].filter(Boolean).join('، ')} style={{ gap: Space.xs }}>
      <Row style={{ alignItems: 'flex-start' }}>
        {over && <Icon name="warning" size={18} color={p.negative} />}
        <View style={{ flex: 3 }}>
          <T>{label}</T>
        </View>
        {trailing ? (
          <View style={{ flex: 2 }}>
            <T variant="small" color={over ? p.negative : p.onSurfaceMuted} style={{ textAlign: 'auto' }}>
              {trailing}
            </T>
          </View>
        ) : null}
      </Row>
      <View style={{ height: 8, borderRadius: Radii.pill, backgroundColor: p.surfaceMuted, overflow: 'hidden' }}>
        <View style={{ height: 8, width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`, backgroundColor: color }} />
      </View>
    </View>
  );
}

/** "Label ..... value" that wraps the value below at large text sizes. */
export function TotalRow({ label, value, testID }: { label: string; value: string; testID?: string }) {
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`} testID={testID} style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: Space.sm }}>
      <T>{label}</T>
      <T variant="subtitle" style={{ fontFamily: Fonts.bold }}>
        {value}
      </T>
    </View>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: IconName; title: string; body?: string; action?: ReactNode }) {
  const { p } = useUi();
  return (
    <View style={{ alignItems: 'center', padding: Space.xxl, gap: Space.md }}>
      <View importantForAccessibility="no-hide-descendants" style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: p.primaryContainer, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={32} color={p.onPrimaryContainer} />
      </View>
      <T variant="subtitle" center>
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
      <IconButton testID="month.prev" icon="back" label={s.prevMonth} onPress={() => c.setMonth(addMonths(st.month, -1))} />
      <View style={{ flexShrink: 1 }}>
        <T variant="subtitle" center testID="month.label">
          {formatMonth(st.month, st.locale)}
        </T>
      </View>
      <IconButton testID="month.next" icon="forward" label={s.nextMonth} disabled={isCurrent} onPress={() => c.setMonth(addMonths(st.month, 1))} />
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
