import * as LocalAuthentication from 'expo-local-authentication';
import { useEffect } from 'react';
import { View } from 'react-native';

import { useUi } from './AppContext';
import { Button, Icon, T } from './components';
import { Space } from './theme';

/**
 * App lock with the device's own security (Face ID / fingerprint / passcode).
 * Nothing is stored by the app: the OS does the check and returns yes/no.
 */
export async function canUseLock(): Promise<boolean> {
  try {
    return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.getEnrolledLevelAsync()) !== LocalAuthentication.SecurityLevel.NONE;
  } catch {
    return false;
  }
}

export async function authenticate(promptMessage: string, cancelLabel: string): Promise<boolean> {
  try {
    const r = await LocalAuthentication.authenticateAsync({ promptMessage, cancelLabel });
    return r.success;
  } catch {
    return false;
  }
}

/** Shown instead of the app while locked. Asks once on appear; button to retry. */
export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { s, p } = useUi();
  const tryUnlock = async () => {
    if (await authenticate(s.unlockPrompt, s.cancel)) onUnlock();
  };
  useEffect(() => {
    tryUnlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <View testID="lockScreen" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: Space.xl, padding: Space.xl, backgroundColor: p.background }}>
      <View style={{ width: 96, height: 96, borderRadius: 32, backgroundColor: p.primaryContainer, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="lock" size={48} color={p.primary} />
      </View>
      <T variant="headline" center>
        {s.lockedTitle}
      </T>
      <Button label={s.unlock} icon="fingerprint" onPress={tryUnlock} testID="lock.unlock" />
    </View>
  );
}
