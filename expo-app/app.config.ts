import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Build variants. `app.json` holds the production config; this file only
 * applies overrides for non-production variants so a preview APK installs
 * next to the production app and can never be mistaken for it.
 *
 *   APP_VARIANT unset      -> production  (om.tharwati.tharwati)
 *   APP_VARIANT=preview    -> internal QA (om.tharwati.tharwati.preview)
 *
 * The variable is set per build profile in eas.json.
 */
const variant = process.env.APP_VARIANT;

export default ({ config }: ConfigContext): ExpoConfig => {
  const base = config as ExpoConfig;
  if (variant !== 'preview') return base;
  return {
    ...base,
    name: `${base.name} (تجريبي)`,
    android: { ...base.android, package: `${base.android?.package}.preview` },
    ios: {
      ...base.ios,
      bundleIdentifier: `${base.ios?.bundleIdentifier}.preview`,
    },
  };
};
