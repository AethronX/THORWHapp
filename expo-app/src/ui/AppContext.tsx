import { createContext, ReactNode, useContext, useMemo, useSyncExternalStore } from 'react';
import { useColorScheme } from 'react-native';

import type { AppController, AppState } from '../state/appController';
import { STRINGS, Strings } from './i18n';
import { formatMoney } from './format';
import { dark, light, Palette } from './theme';

const Ctx = createContext<AppController | null>(null);

export function AppProvider({ controller, children }: { controller: AppController; children: ReactNode }) {
  return <Ctx.Provider value={controller}>{children}</Ctx.Provider>;
}

export function useController(): AppController {
  const c = useContext(Ctx);
  if (!c) throw new Error('AppProvider missing');
  return c;
}

/** Current immutable app state; re-renders on every change. */
export function useAppState(): AppState {
  const c = useController();
  return useSyncExternalStore(c.subscribe, c.getState, c.getState);
}

export interface UiKit {
  s: Strings;
  p: Palette;
  rtl: boolean;
  /** Format minor units in the active currency and language. */
  money: (minor: number, signed?: boolean) => string;
}

export function useUi(): UiKit {
  const st = useAppState();
  const scheme = useColorScheme();
  const isDark = st.themeMode === 'dark' || (st.themeMode === 'system' && scheme === 'dark');
  return useMemo(
    () => ({
      s: STRINGS[st.locale],
      p: isDark ? dark : light,
      rtl: st.locale === 'ar',
      money: (minor: number, signed = false) => formatMoney(minor, st.currency, st.locale, signed),
    }),
    [st.locale, st.currency, isDark],
  );
}
