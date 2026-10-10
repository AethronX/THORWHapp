# ثروتي — Tharwati (Expo / React Native)

Arabic-first personal finance app: income, expenses, budgets, savings goals and a savings
calculator, plus a five-question onboarding that builds a personal plan and an analytics tab
(financial-health score, safe-to-spend per day, month-end forecast, category and 6-month charts).
Smart and modern, all on the device: quick add with a keypad and automatic category suggestion,
recurring-payment detection, spending calendar, unusual-expense alert, hide-amounts mode, app lock
(Face ID / fingerprint), haptics and motion that respect Reduce Motion, Liquid Glass on iOS 26.
Guidance: a ranked "next step" with its reason, one real action and "not now"; Arabic-tolerant search and
category filters for expenses.
Local-only (SQLite on the device), no account, no ads, no tracking.
Competitor study: `../docs/COMPETITIVE_ANALYSIS.md` · design research 2026: `../docs/DESIGN_RESEARCH_2026.md` · audit 2030: `../docs/AUDIT_2030.md` · formulas: `../docs/ANALYTICS.md`.

Screenshots (web render of the real screens with sample data, iPhone size): `../docs/screenshots/`.

**Stack:** Expo SDK 57 · React Native 0.86 · TypeScript · Expo Router · expo-sqlite.
Runs in **Expo Go** (only modules bundled in Expo Go are used).

## 1. Run on your phone with Expo Go
Requirements: Node.js 20+ and the **Expo Go** app (Play Store / App Store) on your phone.

```bash
git clone https://github.com/AethronX/THORWHapp.git
cd THORWHapp
git checkout claude/great-brown-kz81yw
cd expo-app
npm install
npx expo start
```
Scan the QR code with Expo Go (Android) or the Camera app (iOS). Phone and computer must be on
the same Wi-Fi; if not, use `npx expo start --tunnel`.

## 1b. Expo Go on any network, laptop off (EAS Update)
Publish the app to Expo's servers once; Expo Go then opens it from anywhere.
```bash
npx eas-cli@latest login
npx eas-cli@latest init                      # first time only
npx eas-cli@latest update --branch preview --message "first preview"
```
Open the link it prints (expo.dev → Updates) on the iPhone and choose **Open in Expo Go**, or scan
its QR code with the Camera. Sign in to Expo Go with the **same Expo account**.
After later code changes, run the `update` command again and reopen the project in Expo Go.
Installed builds never check for updates by themselves (`updates.checkAutomatically: NEVER`).
The app targets iOS and Android only (`expo.platforms`), so `eas update` does not try to build a web bundle.

## 2. Checks
```bash
npm run typecheck     # TypeScript
npm test              # Jest (unit, data, controller, UI journey, design system)
npx expo-doctor       # project health (needs internet)
```

## 3. Installable APK with EAS Build (internal testing)
`eas.json` has a **preview** profile → an `.apk` you can install directly. It uses
`APP_VARIANT=preview`, so it installs as **«ثروتي (تجريبي)»** with package
`om.tharwati.tharwati.preview`, next to (never replacing) the production app.
The **production** profile (`.aab` for Google Play, `om.tharwati.tharwati`) is untouched.

```bash
npm install -g eas-cli        # or prefix commands with: npx eas-cli@latest
eas login                     # free Expo account
eas init                      # first time only: links the project to your Expo account
eas build -p android --profile preview
```
If `eas init` says it cannot edit the dynamic config, copy the `projectId` it prints into
`app.json` under `expo.extra.eas.projectId`, then continue.
On the first build, answer **Yes** to "Generate a new Android Keystore?" (EAS stores it for you).
When the build finishes, EAS shows a link/QR code to download and install the APK.
The free plan is enough; builds may wait in a queue.

Not needed for the APK and not done: `eas submit`, Google Play, paid EAS plans.

## Project layout
```
src/app/          screens (Expo Router: (tabs)/ incl. analytics, onboarding, profile, income, budgets, categories,
                  expense/[id], goal/[id])
src/core/         currency, amount parsing (no floating point), calendar dates
src/domain/       finance engine, insights, analytics, profile/plan, models — pure TypeScript
src/data/         SQLite schema + migrations, repository, expo-sqlite driver
src/state/        AppController (app state) + selectors
src/ui/           theme tokens, strings (ar/en), formatting, shared components, charts,
                  icons (Phosphor duotone paths), onboarding questionnaire
assets/brand/     app icon, adaptive icon, splash (SVG sources + PNG)
scripts/          gen-icons.py (src/ui/iconPaths.ts) · gen-brand.py (assets/brand/)
__tests__/        engine, parser, insights, repository (real SQLite via sql.js),
                  controller, end-to-end UI journey, colour contrast
```
Formulas and their independent reference values: `../docs/FINANCE_FORMULAS.md`.
