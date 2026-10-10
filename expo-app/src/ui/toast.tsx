import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useUi } from './AppContext';
import { Icon, Row, T } from './components';
import { haptic } from './feedback';
import { MIN_TAP, Radii, Space } from './theme';

/**
 * One short message at the bottom ("snackbar"), optionally with one action —
 * used for UNDO instead of "are you sure?" dialogs (recover from mistakes
 * rather than interrupt every time). Announced to screen readers.
 */
export interface ToastOptions {
  message: string;
  actionLabel?: string;
  onAction?: () => void | Promise<unknown>;
  /** Milliseconds on screen; long enough to read and reach the action. */
  durationMs?: number;
}

type Listener = (t: (ToastOptions & { id: number }) | null) => void;
let listener: Listener | null = null;
let seq = 0;

export function showToast(t: ToastOptions) {
  listener?.({ ...t, id: ++seq });
}

export function hideToast() {
  listener?.(null);
}

/** Mounted once at the root. */
export function ToastHost() {
  const { p } = useUi();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<(ToastOptions & { id: number }) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    listener = (t) => {
      if (timer.current) clearTimeout(timer.current);
      setToast(t);
      if (t) {
        AccessibilityInfo.announceForAccessibility?.(t.actionLabel ? `${t.message}. ${t.actionLabel}` : t.message);
        timer.current = setTimeout(() => setToast(null), t.durationMs ?? 6000);
      }
    };
    return () => {
      listener = null;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  if (!toast) return null;
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        start: 0,
        end: 0,
        // Above the tab bar (64) and the floating add button (56 + margins), so neither is covered.
        bottom: insets.bottom + 152,
        alignItems: 'center',
        paddingHorizontal: Space.lg,
      }}
    >
      <View testID="toast" accessibilityLiveRegion="polite" style={{ width: '100%', maxWidth: 560 }}>
        <Row
          gap={Space.md}
          style={{
            backgroundColor: p.inverseSurface,
            borderRadius: Radii.md,
            paddingStart: Space.lg,
            paddingEnd: Space.sm,
            minHeight: MIN_TAP,
          }}
        >
          <View style={{ flex: 1, paddingVertical: Space.sm }}>
            <T color={p.inverseOnSurface} testID="toast.message">
              {toast.message}
            </T>
          </View>
          {toast.actionLabel && toast.onAction ? (
            <Pressable
              testID="toast.action"
              accessibilityRole="button"
              accessibilityLabel={toast.actionLabel}
              onPress={() => {
                haptic.tap();
                const act = toast.onAction!;
                setToast(null);
                void act();
              }}
              style={{
                minHeight: MIN_TAP,
                justifyContent: 'center',
                paddingHorizontal: Space.md,
              }}
            >
              <Row gap={Space.xs}>
                <Icon name="repeat" size={16} color={p.inversePrimary} />
                <T variant="label" color={p.inversePrimary}>
                  {toast.actionLabel}
                </T>
              </Row>
            </Pressable>
          ) : null}
        </Row>
      </View>
    </View>
  );
}
