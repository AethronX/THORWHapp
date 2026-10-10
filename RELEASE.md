# Release process

## Expo app (current) — `expo-app/`
Builds are made with **EAS Build** from the owner's machine (`eas login`). Step-by-step launch checklist,
owner decisions and build commands: **`docs/LAUNCH_CHECKLIST.md`**. Store texts and form answers:
`docs/STORE_LISTING.md`. Privacy: `PRIVACY.md` and the public-policy draft `docs/PRIVACY_POLICY_AR.md`.
- Version: `expo.version` (now 0.9.0, release candidate), `android.versionCode`, `ios.buildNumber` in `app.json`
  — raise them for every store build.
- Database: schema v2; every schema change needs a migration step and a test that upgrades a real older database
  (see `__tests__/dataV2.test.ts`). The app refuses a database written by a newer schema, so never ship a schema
  bump in a build you might need to roll back.
- `eas update` targets iOS and Android only (`expo.platforms`).

---

## Flutter app (legacy, kept for reference)

Status: **no release build has been produced yet.** The development container could not download the
Android SDK (`dl.google.com` / `maven.google.com` blocked by its network policy). Everything below
must be executed on a machine with Android Studio / the Android SDK.

## 1. One-time setup (owner action required)
1. **Google Play Console developer account.** Check the current account type (personal vs.
   organisation). Newer *personal* accounts must run a **closed test with a minimum number of testers
   for a minimum period** before production access — verify the current numbers in Play Console help
   at the time of setup; do not rely on figures in this file.
2. **Application ID.** Currently `om.tharwati.tharwati` (`android/app/build.gradle.kts`). Decide the
   final ID before the first upload — it can never change afterwards.
3. **Upload key (signing).**
   ```bash
   keytool -genkey -v -keystore ~/keys/tharwati-upload.jks -keyalg RSA -keysize 2048 \
     -validity 10000 -alias upload
   ```
   Create `android/key.properties` (git-ignored — never commit it or the `.jks`):
   ```
   storePassword=...
   keyPassword=...
   keyAlias=upload
   storeFile=/absolute/path/tharwati-upload.jks
   ```
   Then replace the `release` block in `android/app/build.gradle.kts`, which **currently signs
   release builds with the debug key** (Flutter template default), with a signing config that reads
   `key.properties`. Enrol in **Play App Signing** so Google holds the app signing key; keep the
   upload key backed up offline (password manager + offline copy).
4. Store listing (Arabic first), screenshots, privacy policy URL, **Data safety form** (matches
   PRIVACY.md: no data collected/shared in v0.1), content rating, target audience. Financial apps may
   need the "Financial features" declaration — answer accurately (budgeting/planning tool, no loans,
   no investments, no payments).

## 2. Per-release checklist
- [ ] `flutter analyze` clean, `flutter test` all green (record counts in TESTING.md)
- [ ] On-device smoke test of the journey in TESTING.md on at least one low-end Android device, in
      Arabic and English, light and dark, with large font size and TalkBack
- [ ] Bump `version:` in `pubspec.yaml` (`x.y.z+build`; build number must increase) and
      `appVersion` in `lib/presentation/screens/settings_screen.dart`
- [ ] If the DB schema changed: new migration step + migration test from every shipped version
- [ ] `flutter build appbundle --release`
- [ ] Upload to **internal testing** first → closed testing → production (staged rollout 10 % → 50 % → 100 %)
- [ ] Update PROJECT_STATUS.md and a CHANGELOG entry

## 3. Environments
| Env | What | Data |
|---|---|---|
| dev | `flutter run` debug | developer's own test data |
| test | `flutter test` on host | temporary DB per test, deleted after |
| internal / closed testing | Play tracks | testers' own data, with consent |
| production | Play production | real users |

No backend → no server environments yet. When one is added: separate projects/keys per environment,
secrets only in the server's secret store, `.env.example` documents names only.

## 4. Rollback
Play cannot downgrade installed apps. Rollback = halt the staged rollout, then ship a new build with
a **higher** version code containing the previous code. Because the app refuses to open a database
written by a newer schema (by design, to avoid data loss), **never ship a schema bump in a build you
might need to roll back**: ship the migration in its own release first.

## 5. Payments
Not enabled. See docs/MONETIZATION.md for prerequisites (merchant account, payments profile,
licence testers, server-side verification) before any billing code ships.
