# Decision log

Format: context → decision → consequences / when to revisit. Newest last.

### D-001 Flutter for Android first, iOS later — 2026-10-09
Need one codebase for Android now and iOS later, strong RTL support, and a small team.
**Decision:** Flutter 3.47.5 stable (Dart 3.13.4). Chosen over the 3.47.7 published the day before
work started, to avoid a release with no field time. **Revisit:** at each stable minor.

### D-002 Local-only, no account, no backend in v1 — 2026-10-09
P0 needs no server: all calculations are local and deterministic. A backend adds cost, an attack
surface, and legal obligations (data hosting, cross-border transfer) before the product has proven demand.
**Decision:** SQLite on device; release build requests no INTERNET permission; single profile per
device. **Consequences:** no multi-device sync; no "other user's data" path exists. Reinstalling or
losing the phone loses data until export/backup ships (P1). **Revisit:** when sync (P2) is scheduled.

### D-003 State: one ChangeNotifier + InheritedNotifier, no state package — 2026-10-09
App has one data domain and roughly ten screens. Riverpod/Bloc would add dependencies and concepts
without solving a current problem.
**Decision:** `AppController` + `AppScope`. **Revisit:** when a second independent data domain
(billing, sync) arrives or the controller exceeds ~400 lines; then split per feature.

### D-004 Money as integer minor units; parse strings directly — 2026-10-09
Binary floats can't represent 0.1. OMR has **3** decimals (baisa), unlike most currencies.
**Decision:** store `int` minor units with the ISO 4217 exponent per currency; parse user input
string → int without `double`; compound maths in `double` only inside the engine, rounded once.
User input capped at 999,999,999 major units to stay exact below 2^53.

### D-005 Single currency per data set; changing currency requires reset — 2026-10-09
Re-labelling stored OMR amounts as USD would silently change their meaning (and exponent 3 → 2).
FX conversion needs rates (network, data source, licensing).
**Decision:** currency chosen at onboarding; Settings shows it read-only with an explanation.
**Revisit:** with multi-currency accounts (GCC expansion), storing currency per row.

### D-006 Calendar dates as local strings — 2026-10-09
Storing an expense day as a UTC timestamp moves it across midnight when the time zone changes
(travel within GCC is common).
**Decision:** `YYYY-MM-DD` / `YYYY-MM` text in the user's calendar; audit fields in UTC ms.

### D-007 Income is per month, with explicit "use last month's income" — 2026-10-09
"Recurring salary" models break history when salary changes. Per-month lines keep history exact.
**Decision:** income lines per month + one-tap copy from the previous month; never copied silently.

### D-008 Budgets are recurring per-category limits — 2026-10-09
Simplest model most users understand. Total budget = sum of category limits.
**Revisit:** if users ask for month-specific limits or rollover.

### D-009 Categories with history are archived, not deleted — 2026-10-09
Deleting would orphan expenses or delete history. FK is `ON DELETE RESTRICT`.

### D-010 Goals: saved = sum of contributions — 2026-10-09
Keeps an auditable history (deposits and withdrawals) to show progress over time later.
Withdrawals cannot exceed the saved total (checked inside a transaction).

### D-011 Rule-based insights, no AI in v1 — 2026-10-09
Explainable, free, offline, testable. AI is P2, optional, server-proxied (ARCHITECTURE.md).

### D-012 Return scenarios: user-entered rate, always next to 0 % — 2026-10-09
Avoid implying a promised return. Default example rate 4 % / inflation 2 % are editable placeholders
for illustration, not market forecasts. Disclaimer always visible. No product recommendations.

### D-013 Bundle IBM Plex Sans Arabic — 2026-10-09
Default Android fonts vary by OEM; Arabic numerals/typography quality matters for trust.
OFL-licensed, includes Latin. Obtained from the `@expo-google-fonts/ibm-plex-sans-arabic` npm package
(Google Fonts mirror) because github.com was not reachable from the build container. Licence:
`assets/fonts/OFL.txt`. ~700 KB added to the app.

### D-014 Western digits in both languages — 2026-10-09
Omani banking apps commonly show Western digits; mixing digit systems in tables reduces scanability.
Input accepts both. **Revisit:** after user testing (could become a setting).

### D-015 Android backup disabled — 2026-10-09
Auto-backup would upload the finance DB to the user's Google account, contradicting "data stays on
this device" in the privacy screen. **Decision:** `allowBackup=false` + data-extraction rules
excluding cloud backup and device transfer. **Consequence:** phone migration loses data until
user-initiated export (P1). **Revisit:** when export/import ships.

### D-016 Single reviewer agent instead of 20 parallel agents — 2026-10-09
The brief describes 20 roles. For a ~3k-line codebase, parallel agents editing shared files would
create conflicts and duplicated systems. **Decision:** one integrator implements the slice following
the role checklists; an independent subagent performs the QA/Security review role read-only.
Role ownership is tracked in TASKS.md for when the team grows.

### D-017 Comma handling in amount input — 2026-10-09
Review found `1,5` was read as 15. Keyboards differ: some use `,` as the decimal key; others insert
thousands separators. **Decision:** `.`/`٫` decimal; `٬` always grouping (validated); a single `,`
followed by 1–2 digits is a decimal comma; `,` followed by exactly 3 digits with no `.` (e.g.
`12,500`) is **rejected as ambiguous** (12.5 or 12,500 for OMR); other commas must form valid groups
of three. Never guess silently with money.

### D-018 Goal months = month-end deposits until target — 2026-10-09
Aligns "months left" with the engine's end-of-month deposit convention (a target on the last day of a
month includes that month's deposit). See docs/FINANCE_FORMULAS.md.

### D-019 Rebuild in Expo / React Native (owner decision) — 2026-10-09
The owner wants to preview the app in **Expo Go** and build APKs with **EAS Build**; neither supports
Flutter. **Decision (owner-approved):** rebuild in Expo SDK 57 + React Native + TypeScript under
`expo-app/`, porting the domain logic and its tests 1:1 (same reference values, same rules D-004…D-018).
The Flutter app stays in the repository root, unchanged, until the owner decides to remove it.
Expo-specific choices: Expo Router (file-based routes, `Stack.Protected` for onboarding);
expo-sqlite behind a small `Db` interface so tests run the same SQL on sql.js; explicit `direction`
style for RTL (works in Expo Go without native restarts); only Expo Go-bundled native modules;
`app.config.ts` + `APP_VARIANT` so the EAS **preview** APK (`om.tharwati.tharwati.preview`) never
replaces or alters the production config.

### D-020 Light theme is the default (owner decision) — 2026-10-09
Light (ivory canvas, white cards) is the global language of banking and luxury and reads best in
daylight. New and existing users start in light unless they explicitly chose dark/system. Dark stays
available and meets the same rules. Design system: docs/DESIGN_SYSTEM.md.

### D-021 Ordinary spending is not shown in red — 2026-10-09
Users with limited incomes should not feel judged for every purchase. Expense amounts use the
neutral ink colour; red is reserved for over-budget and negative cash flow, always with an icon/words.

### D-022 Phosphor duotone icons, extracted locally — 2026-10-09
Competitor review (docs/COMPETITIVE_ANALYSIS.md): most budgeting apps use stock Material/Ionicons;
the premium ones (Copilot, Monarch) use custom, softer duotone-style sets. **Decision:** Phosphor
(MIT) duotone, but only the path data we use, generated by `expo-app/scripts/gen-icons.py` into
`src/ui/iconPaths.ts` and drawn with `react-native-svg` (bundled in Expo Go). Importing the library
directly made `tsc` type-check its sources and pulled every icon. Screens use semantic names only.
`@expo/vector-icons` stays installed because expo-router references it, but the app no longer uses it.

### D-023 Five-question onboarding that builds a plan — 2026-10-09
A quiz is only worth the friction if every answer changes what the user sees. **Decision:** five
optional questions (goal, income type, payday — salary only, the category they worry about,
saving habit), skippable in one tap, ~30 s. Answers produce a plan (savings rate 10/15/20 %, an
emergency or purchase goal, a 10 % budget for the worry category) the user can accept item by item.
Rules are fixed and documented (docs/ANALYTICS.md); not financial advice. The profile is stored as
one JSON setting (no schema change), cleared by "delete all", and editable from Settings.

### D-024 Analytics tab; the calculator leaves the tab bar — 2026-10-09
Statistics were the most-requested gap versus competitors. **Decision:** a fifth tab, «التحليلات»:
transparent health score (0–100, four visible components and the next step), safe-to-spend per day
(rounded down), linear month-end forecast, comparison with last month, category donut and 6-month
bars, all computed on the device by pure, tested functions (`src/domain/analytics.ts`). To keep five
tabs, the savings calculator moved behind buttons in Goals and Settings (route unchanged).

### D-025 App icon: Omani arch, no letterforms — 2026-10-09
The first mark (the letter «ث» with its dots as gold coins) was flagged by the owner as resembling
the logo of **Thawani**, an existing Omani payments app. Confusion with a real fintech brand is a
trust and trademark risk. **Decision:** replace it with an Omani arch holding three rising gold bars,
generated by `expo-app/scripts/gen-brand.py`. Rule for future marks: no Arabic-letter monograms or
coin-dot motifs that echo local payment brands. A formal trademark search is still needed before release.

### D-026 Quick add: amount first, smart category on the device — 2026-10-09
Research (docs/DESIGN_RESEARCH_2026.md) shows the best apps cut logging to 2–3 taps. **Decision:**
the add button opens a keypad-first screen; the category is suggested from the note — the user's own
history first, then an Arabic/English keyword list with Omani/GCC merchants. Deterministic, offline,
explainable ("from your history" / "suggested"). The full form stays one tap away ("More details").

### D-027 Recurring payments, spending calendar, unusual expense — 2026-10-09
Rules, not AI (src/domain/smart.ts): recurring = same note (or, without a note, a bill-type category +
amount ±5 %) in ≥ 2 of the last 3 months, at most once per month, on a similar day (±5) and amount
(±15 %) — a first version without the once-a-month/day rules flagged grocery runs as "recurring"; unusual = ≥ 2.5× the category median with ≥ 4 earlier
expenses; weekday habit ≥ 1.4× an even split with ≥ 10 expenses over ≥ 3 weeks. Fixed bills are
excluded from habit/anomaly checks. The controller loads 4 months of expenses for these.

### D-028 Motion, haptics, Liquid Glass — with restraint — 2026-10-09
Following Apple HIG and Material 3 Expressive: count-up amounts, drawn charts, springy presses,
staggered cards — all disabled by the system "Reduce Motion" (and in tests). Haptics with their
documented meanings (selection / success / warning) and a Settings switch to turn them off.
Liquid Glass (expo-glass-effect, iOS 26+) only on the floating add button — a control above
content — never on cards or amounts; solid fallback elsewhere.

### D-029 Privacy: hide amounts and app lock — 2026-10-09
"Hide amounts" masks every amount (and its screen-reader text) with one tap. App lock uses the OS
(Face ID / fingerprint / passcode via expo-local-authentication); the app stores no secret. Locked on
cold start and after > 60 s in the background; turning it on or off requires authentication; the lock
screen is shown before any data renders.

### D-030 Owner's brand palette as anchors, with AA-safe text shades — 2026-10-10
Owner direction (Tharwati 2030): deep green #0F513F, ivory #F7F5EF, gold #D4AF57, mid green #2E7D68,
grey #6B7280, red #C94F4F. Measured on ivory: gold 1.91:1, grey 4.43:1, red 4.09:1 — below WCAG 4.5:1
for text. **Decision:** the six colours are the identity anchors (primary, background, hero, brand gold,
progress); where a colour carries text, a minimally darker shade is used — grey #626976 (5.1:1), red
#B14646 (5.0:1), mid green #2B7461 (5.1:1), gold on the hero #D6B35F (4.6:1). Brand gold is decoration
only (hero hairline, marks), enforced by a test. Mid green #2E7D68 colours progress bars. App icon and
splash moved to the same deep green. Dark mode keeps its own tested palette.

### D-031 "Net cash flow", dated and defined — not "left over" — 2026-10-10
The home hero called (income − spending this month) «المتبقي», which reads like a balance. **Decision:**
«صافي التدفق · <month>», a one-line definition, and a note that figures come only from what the user
records and are not the bank balance. Cash balance and net worth are different measures and are not
shown until the app records them (see docs/AUDIT_2030.md).

### D-032 Guidance engine v1: one next step, with reason, action and "not now" — 2026-10-10
Alerts told users what was wrong but not what to do. **Decision:** a rule-based engine
(src/domain/guidance.ts, rules in docs/ANALYTICS.md §6) ranks concrete steps for the current month; the
home screen shows the top one under the hero with "Why this step?" (the user's own numbers + "based only on
what you recorded; not financial advice"), one action the app really performs (prefilled budget editor or
goal form, income, goals) and "Not now" (hidden for the rest of the month, stored locally). Rules stay
silent without enough data (e.g. emergency fund needs 2+ months of essential spending). Alerts no longer
repeat the step shown. Found by a UI test: suggesting last month's total as a limit could be below what was
already spent — the suggestion is now max(last month, spent so far).

### D-033 Search and filters inside the viewed month — 2026-10-10
**Decision:** the expenses tab gets a search box (note + category name; every word must match as a word
prefix; Arabic letter forms, «ال» and diacritics ignored via the same normaliser as smart suggestions) and
category chips (only categories used that month, biggest first), with a "n of N · total" line and a
no-results state that offers "Clear filters". The month switcher is the date filter; income stays on its
own screen. Search across all months needs a repository query — later.

### D-034 Obligations, assets and net worth — manual, explicit, no double counting — 2026-10-10
**Decision (schema v2, additive):** obligations store the amount outstanding when recorded; remaining =
that − recorded payments (editing sets the current remaining and keeps payment history). A payment can also
be logged as an expense in the «debt» category in the same transaction, so cash flow stays consistent.
Assets are valued manually, may be flagged "estimate", and show the date of the value. **Net worth = assets −
remaining obligations only**: income is a flow, and goal savings are not added (the account holding them can
be listed as an asset — adding both would count money twice); the screen says so. Payoff plans reuse the
tested `debtPayoff` engine with a "pay 10 % more" scenario, and state the assumptions (fixed rate, no fees,
no new borrowing). Goals can be paused (kept, excluded from guidance and "at risk").

### D-035 Manual export (backup) through the share sheet; no restore yet — 2026-10-10
No server, no sync (D-001 privacy stance), so users need a way to keep their data. **Decision:** Settings →
"Export your data": a full JSON backup (every table as stored, with format and schema versions, so a future
restore can read it) and an Excel-ready CSV of expenses (UTF-8 BOM for Arabic, RFC 4180 quoting, formula-
injection guard, plain decimal amounts). Files are written to the app cache and handed to the system share
sheet — the user chooses the destination; Tharwati uploads nothing. The screen states that restore is not
available yet. Uses expo-file-system and expo-sharing (both in Expo Go).

### D-036 Design & colour polish: brand-family category colours, LRM percents, stacked amounts — 2026-10-10
Review of every screen found: saturated "chart-library" category colours (royal blue, purple, orange) clashing
with the emerald/gold identity; «%57» instead of «57%» in Arabic; amounts split across lines in progress rows;
a muddy-brown near-limit bar; default system switches. **Decision:** categories are regenerated as one family
(OKLCH L 0.50 / C 0.12, hues 30° apart, housing on the brand emerald hue; dark mode L 0.79) — text ≥ 4.76:1,
ΔE ≥ 0.051, tested; percentages are wrapped in LRM like amounts; long progress-row values move to their own
line; near/over-limit bars use golden amber #A86F12 and brand red #C94F4F (non-text, ≥ 3:1, tested); one
branded `Toggle` replaces every Switch.

### D-037 Answers to close local competitors — 2026-10-10
From the owner's screenshots of «مصاريف» and «مصاريفي» (docs/COMPETITORS_LOCAL.md). **Decision:** (1) home
"Log in one tap": the user's most-used everyday categories open quick add with the category preset, plus today /
last 7 days; (2) free-text entry parsed on the device — "قهوة 1.5", "بنزين ٥٫٥ ر.ع", "قهوة 500 بيسة" (baisa → OMR) —
works with keyboard dictation, no AI service, no data sent; (3) optional Arabic-Indic digits (١٢٣) applied only when
text is drawn (the shared T component), never to stored data or inputs. Not copied: a spending-day streak (it would
punish no-spend days) and a day-one paywall.

