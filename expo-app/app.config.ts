import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Dynamic config on top of app.json (production values live there).
 *
 * 1. EAS Update URL — derived from the EAS project id once `eas init` has
 *    written it to app.json (`expo.extra.eas.projectId`), so `eas update`
 *    never has to edit this file. Installed builds never check for updates
 *    on their own (`updates.checkAutomatically: NEVER` in app.json): the app
 *    makes no network calls.
 *
 *    IMPORTANT (corrected 2026-10-10): **Expo Go cannot load EAS updates.**
 *    Expo's own docs state that an update published with a runtimeVersion
 *    does not load in Expo Go and that a development build (expo-dev-client)
 *    is required: https://docs.expo.dev/build/updates/ . The earlier note
 *    here claimed the opposite — that was the behaviour of the retired
 *    `expo publish`, not of EAS Update. To see changes on a phone today, run
 *    the dev server (`npx expo start`) and scan the QR in Expo Go; `eas
 *    update` only reaches development or production builds.
 *
 * 2. Build variants:
 *      APP_VARIANT unset    -> production  (om.tharwati.tharwati)
 *      APP_VARIANT=preview  -> internal QA (om.tharwati.tharwati.preview)
 *    The variable is set per build profile in eas.json.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const base = config as ExpoConfig;
  const projectId: string | undefined = base.extra?.eas?.projectId;
  const withUpdates: ExpoConfig = projectId ? { ...base, updates: { ...base.updates, url: `https://u.expo.dev/${projectId}` } } : base;

  if (process.env.APP_VARIANT !== 'preview') return withUpdates;
  // QA builds check for an EAS update on every launch; production keeps
  // `checkAutomatically: NEVER` so the shipped app makes no network calls.
  return {
    ...withUpdates,
    updates: { ...withUpdates.updates, checkAutomatically: 'ON_LOAD' },
    name: `${base.name} (تجريبي)`,
    android: { ...base.android, package: `${base.android?.package}.preview` },
    ios: { ...base.ios, bundleIdentifier: `${base.ios?.bundleIdentifier}.preview` },
  };
};
