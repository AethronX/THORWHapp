import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Dynamic config on top of app.json (production values live there).
 *
 * 1. EAS Update URL — derived from the EAS project id once `eas init` has
 *    written it to app.json (`expo.extra.eas.projectId`), so `eas update`
 *    never has to edit this file. Installed builds never check for updates
 *    on their own (`updates.checkAutomatically: NEVER` in app.json): the app
 *    makes no network calls. Expo Go loads published updates by itself.
 *
 * 2. Build variants:
 *      APP_VARIANT unset    -> production  (om.tharwati.tharwati)
 *      APP_VARIANT=preview  -> internal QA (om.tharwati.tharwati.preview)
 *    The variable is set per build profile in eas.json.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const base = config as ExpoConfig;
  const projectId: string | undefined = base.extra?.eas?.projectId;
  const withUpdates: ExpoConfig = projectId
    ? { ...base, updates: { ...base.updates, url: `https://u.expo.dev/${projectId}` } }
    : base;

  if (process.env.APP_VARIANT !== 'preview') return withUpdates;
  return {
    ...withUpdates,
    name: `${base.name} (تجريبي)`,
    android: { ...base.android, package: `${base.android?.package}.preview` },
    ios: { ...base.ios, bundleIdentifier: `${base.ios?.bundleIdentifier}.preview` },
  };
};
