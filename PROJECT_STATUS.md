# Project status

## Update 2026-10-09 (latest): competitor study, onboarding questions, analytics, new icons
Study: docs/COMPETITIVE_ANALYSIS.md (desk research, not hands-on testing). Formulas: docs/ANALYTICS.md.
Built: five-question onboarding → personal plan (D-023); analytics tab with health score,
safe-to-spend per day, month-end forecast, last-month comparison, category donut, 6-month bars (D-024);
Phosphor duotone icons (D-022); new app icon — Omani arch with rising gold bars, replacing a «ث» mark
that resembled the Thawani logo (D-025).

| Check | Result |
|---|---|
| `npx tsc --noEmit` | 0 errors |
| `npx jest` | **242 tests passing** (8 suites) |
| `npx expo export` | Android 3.2 MB and iOS 2.9 MB Hermes bundles build |

Screenshot review (docs/screenshots/, web render with sample data) found and fixed: tab labels clipped
by the Arabic font, «ر.ع..» double full stop, a month-end forecast that extrapolated rent paid on the 1st
(false over-income warning), and a partial-month vs full-month comparison. 246 tests passing.

Not verified here: on-device look and feel, Expo Go on a phone, EAS build, trademark search for the icon.

## Update 2026-10-09 (later): Expo rebuild — `expo-app/`
Owner chose Expo / React Native (Expo Go + EAS Build). Verified in this container:

| Check | Result |
|---|---|
| `npx tsc --noEmit` | 0 errors |
| `npx jest` | **91 tests passing**, stable over 3 runs (engine, parser, insights, repository on real SQLite, controller, end-to-end UI journey through the real Expo Router screens, colour contrast) |
| `npx expo export --platform android` | Android JS bundle builds (3.4 MB Hermes bytecode) |
| `eas.json` | Valid per `@expo/eas-json`; preview → internal APK, `om.tharwati.tharwati.preview`; production unchanged |
| `npx expo-doctor` | 19/21 pass; 2 checks need `exp.host` (blocked here) — re-run on your machine |

Not verified here: running in Expo Go on a phone, an actual EAS build (needs your Expo account).
Fixes found by tests during the rebuild: missing `expo-asset` dependency (required by `expo-font`).

---

## Flutter implementation (original, kept for reference)


**Phase A (build P0), slice 1 complete on the host. Not yet built for or run on Android.**
Not ready for publication (see "Definition of done" below).

## Environment (as found)
| Item | Finding |
|---|---|
| Repository | Empty (no commits) on branch `claude/great-brown-kz81yw` |
| OS | Linux x86_64 container |
| Flutter | Not installed → installed **3.47.5 stable** (Dart 3.13.4) from Google's release storage |
| Java | OpenJDK 21 |
| Android SDK | **Not available.** `dl.google.com` and `maven.google.com` are blocked by the container's network policy, so no APK/AAB can be built here |
| pub.dev / npm | Reachable |
| github.com (HTTP) | Blocked (403) — git push via the session proxy works |
| Agents | Subagents available; one used as independent QA/Security reviewer (DECISIONS D-016) |

## Verified (actually run)
| Check | Result |
|---|---|
| `flutter analyze` | No issues |
| `dart format --set-exit-if-changed` | Clean |
| `flutter test` | **97 tests, all passing** (engine, parser/dates, repository on real SQLite, controller, end-to-end journey incl. restart, income/categories, accessibility at 1× and 2× text, contrast light/dark) |
| Coverage | 83 % of `lib/` lines (measured before the last 8 tests were added) |
| Independent review | 0 critical; 2 high (1 fixed, 1 iOS-only open), all medium fixed — SECURITY.md |

## Not verified
- `flutter build apk` / `appbundle` — fails: "No Android SDK found" (environment, not code).
- Running on an emulator or phone; TalkBack; real keyboard/date picker; performance.
- iOS (not a v1 target; known backup issue R-1).
- CI workflow (`.github/workflows/ci.yml`) is written but has not run yet — it will on the first push.

## What exists
All 15 P0 features (ROADMAP.md table), Arabic RTL + English, light/dark, rule-based insights,
finance engine incl. emergency-fund and debt-payoff functions (no screens yet), docs set.

## Not built (by design for now)
Payments/subscriptions, accounts, sync, AI, analytics, notifications, export, app lock, launcher icon.

## Needs the owner
1. A machine with Android Studio/SDK (or allow `dl.google.com` + `maven.google.com` in this
   environment's network policy) to build and test on a device.
2. Google Play developer account details; final application ID; upload signing key.
3. Privacy policy text reviewed against Oman's PDPL before any public listing.
4. Closed-test participants (with consent).

## Definition of done for "ready to publish" — current state
| Criterion | State |
|---|---|
| Builds in target environment | ❌ not yet attempted on Android |
| Critical tests pass | ✅ host |
| No known critical security issues | ✅ (open items are high/low: iOS backup, release signing) |
| Core journeys complete | ✅ host-verified |
| External requirements documented | ✅ RELEASE.md, docs/MONETIZATION.md |
| Test separated from production | ✅ temp DBs only; no backend |
| Signing / publishing / subscriptions status clear | ✅ documented: not configured / not enabled |
