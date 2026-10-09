import { ReactNode, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';

/**
 * Motion layer. Short, purposeful, interruptible, and OFF when the system
 * "Reduce Motion" setting is on (and in tests, so values are deterministic).
 * Uses React Native's Animated with the native driver where it can.
 */
const IN_TEST = process.env.NODE_ENV === 'test';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(IN_TEST);
  useEffect(() => {
    if (IN_TEST) return;
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => alive && setReduced(v))
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduced;
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Animates an integer from its previous value to `value` (count-up). Returns
 * the value to display; screen readers always get the final value from the
 * caller's accessibilityLabel.
 */
export function useCountUp(value: number, duration = 650): number {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (reduced || IN_TEST) {
      from.current = value;
      setShown(value);
      return;
    }
    const start = from.current;
    const t0 = Date.now();
    let raf = 0;
    const step = () => {
      const k = Math.min(1, (Date.now() - t0) / duration);
      const v = Math.round(start + (value - start) * easeOut(k));
      setShown(v);
      if (k < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      from.current = value;
    };
  }, [value, duration, reduced]);
  return shown;
}

/** 0 → 1 progress for drawing charts on first appearance. */
export function useDrawIn(duration = 700): Animated.Value {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(IN_TEST ? 1 : 0)).current;
  useEffect(() => {
    if (reduced || IN_TEST) {
      v.setValue(1);
      return;
    }
    Animated.timing(v, { toValue: 1, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [reduced, duration, v]);
  return v;
}

/** Fade + rise on mount, staggered by `index` (cards on a screen). */
export function Reveal({ index = 0, children, style }: { index?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(IN_TEST ? 1 : 0)).current;
  useEffect(() => {
    if (reduced || IN_TEST) {
      v.setValue(1);
      return;
    }
    Animated.timing(v, { toValue: 1, duration: 320, delay: Math.min(index, 6) * 60, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [reduced, index, v]);
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/** Pressable that gently scales down while pressed (spring back on release). */
export function PressScale({
  children,
  style,
  outerStyle,
  scaleTo = 0.97,
  ...rest
}: PressableProps & { children: ReactNode; style?: StyleProp<ViewStyle>; /** Layout of the touch target (e.g. flex: 1). */ outerStyle?: StyleProp<ViewStyle>; scaleTo?: number }) {
  const reduced = useReducedMotion();
  const s = useRef(new Animated.Value(1)).current;
  const to = (value: number) => {
    if (reduced) return;
    Animated.spring(s, { toValue: value, useNativeDriver: true, speed: 40, bounciness: value === 1 ? 6 : 0 }).start();
  };
  return (
    <Pressable
      {...rest}
      style={outerStyle}
      onPressIn={(e) => {
        to(scaleTo);
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        to(1);
        rest.onPressOut?.(e);
      }}
    >
      <Animated.View style={[style, { transform: [{ scale: s }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
