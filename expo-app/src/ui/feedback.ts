import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Haptic feedback, used sparingly (Apple HIG): a light tick for selections,
 * a success pattern when money is saved, a warning when a budget is crossed.
 * Never the only signal — every haptic accompanies a visible change.
 */
const supported = Platform.OS === 'ios' || Platform.OS === 'android';
let userEnabled = true;
/** Settings → "Haptics" (Apple HIG: make haptics optional). */
export const setHapticsEnabled = (on: boolean) => {
  userEnabled = on;
};
const safe = (fn: () => Promise<void>) => {
  if (supported && userEnabled) fn().catch(() => undefined);
};

export const haptic = {
  tick: () => safe(() => Haptics.selectionAsync()),
  tap: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
