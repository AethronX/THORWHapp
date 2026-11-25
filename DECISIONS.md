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

### D-038 New official currency signs — drawn only where we can render them correctly — 2026-10-10
Owner request: use the newest symbol for each Arab currency / dollar. Verified (web sources, Oct 2026): Saudi riyal
U+20C1 (Unicode 17.0), UAE dirham U+20C3 (Unicode 18.0, Sept 2026), Omani rial U+20C4 (Central Bank of Oman,
20 Nov 2025; Unicode 18.0). System fonts and IBM Plex Sans Arabic don't have these glyphs yet, so raw characters would
show as empty boxes. **Decision:** bundle tiny MIT fonts (npm `riyal`, `dirham`) used ONLY for the sign character —
the shared T component draws U+20C1/U+20C3 with them — so SAR and AED show the new signs in Arabic and English.
**OMR stays «ر.ع.» for now:** no licensed, verifiable vector of the official glyph was reachable (CBO and Oman
Observer were blocked here; the only package found has an unofficial raster). The code is ready (`NEW_SIGNS.OMR`):
add a font with the official U+20C4 glyph to `CURRENCY_SIGN_FONTS` and it switches. No new symbols found for QAR, KWD,
BHD, EGP, JOD; USD «$» and EUR «€» unchanged. Data, CSV export and inputs keep ISO codes.


### D-039 Behaviour-informed guidance: season funds and "pay yourself first" — 2026-10-10
Owner request: study how people in Arab countries handle money and let it shape the app (docs/BEHAVIORAL_STUDY.md,
desk research with reliability labels; no user research done yet). Strongest evidence for our case: spending peaks
around Ramadan/Eid (Visa, GCC surveys) and reminders naming a specific upcoming expense raised saving more than generic
ones (Karlan et al., NBER w16205); committing saving before money is spent (Thaler & Benartzi). **Decision:** two
guidance rules: (1) `season` — 10–150 days before Ramadan (with Eid) or Eid al-Adha, propose a named goal dated a week
before, in monthly steps; dates are approximate Umm al-Qura expectations stated as such; the app never guesses the
amount; (2) `payYourselfFirst` — payday to +3 days, plan amount > 0, open goal, nothing saved since payday. Goals now
expose their last contribution day (query only, no migration). Not done (needs design / review): ROSCA (jam'iya)
tracker, zakat estimator (religious review), cooling-off list, fresh-start moments. Rejected: social comparison
without real data, spending streaks, fear framing.

### D-040 "Wealth principles" from popular money books, checked against the user's own data — 2026-10-10
Owner request: suggest wealth strategies from the most famous money books, distinctive and clear. **Decision:** a
"Wealth principles" screen (home entry with a score, also in Settings) with six ideas — pay yourself first ≥ 1/10
(Clason, *The Richest Man in Babylon*), room for error ≥ 3 months of essentials in liquid savings (Housel, *The
Psychology of Money*), measure net worth (Stanley & Danko, *The Millionaire Next Door*), what obligations take from
income (Kiyosaki, *Rich Dad Poor Dad*), one debt at a time — snowball vs avalanche shown side by side (Ramsey, *The
Total Money Makeover*), conscious spending on the largest unlimited optional category ≥ 5 % of spending (Sethi,
*I Will Teach You to Be Rich*). Each shows the book, a status (applying / opportunity / needs data — no verdict
without data), the user's own numbers and one action. Ideas are summarised in our own words (no quotes), with a
non-affiliation and not-advice note. Not included: investment product picks or return claims (e.g. index-fund
advice), books whose ideas can't be checked against recorded data.

### D-041 Investing section: readiness, holdings, cost of waiting, learning — no product advice — 2026-10-10
Owner request: add an investment section. Constraint: personalised investment advice / product recommendations are a
licensed activity (in Oman, the Financial Services Authority — Royal Decree 20/2024 replaced the Capital Market
Authority), and the app has no market data and must not promise returns. **Decision:** an "Investing" screen (home
entry with readiness score, also from Wealth and Settings) with: (1) readiness from the user's own data — 3-month
cushion of essentials in liquid savings, no interest-bearing debt (the highest-rate one is named: repaying it is a
certain saving at that rate), a monthly surplus on the month-end forecast; (2) holdings by asset kind from recorded
assets (values as entered, no live prices); (3) the cost of waiting — same monthly amount and end date, started now
vs later, on a return the USER types (prefilled 4 % like the existing calculator, labelled an assumption; can be 0);
(4) neutral learning cards (deposits, sukuk/bonds, funds, stocks, gold, property) with general risk/liquidity and
Sharia-compliant forms mentioned where they exist; (5) safety tips (licence check, "guaranteed high return" = scam
sign, don't invest the emergency fund, fees, never share OTP). Not done: product/fund/stock suggestions, live prices,
portfolio returns, brokerage links.

### D-042 Full review: one definition per concept, safer writes, clearer organisation — 2026-10-10
Owner request: review the whole app (logic, design, formatting, organisation) and fix the gaps. Three parallel reviews
(logic/data, UI/RTL/accessibility, text/navigation/docs) plus a visual pass of every screen. **Fixed:** (1) liquid
savings counted once — the larger of goal savings and cash/bank assets — and used by guidance, principles, investing
and the health score (screens contradicted each other and the same money could count twice); (2) principles/investing
show a "current month only" note with a way back when a past month is viewed (they mixed months); (3) on payday,
safe-to-spend divides by the days to the next payday (it showed the whole month's money per day); (4) a late month load
can no longer overwrite a newer one; (5) repository amounts must be safe integers; (6) money editors and category names
can't be submitted twice; (7) the savings calculator is a normal stack screen with a back button; stack screens
navigate to tabs instead of stacking a second tab bar; iOS modals get a visible Cancel; (8) touch targets ≥ 48
(hit slop), stronger input borders, note field follows the reading direction; (9) spending-calendar day numbers ≥ 4.5:1
in both themes (tested); (10) failed language/theme/month/budget writes show an error; (11) one wording per concept
(«تصنيف», «التزامات», «صندوق الطوارئ»), correct month plurals, no «ر.ع..», no hard-coded Arabic-Indic digits or «٪», LRM
around percentages, localised list separators for screen readers, unused strings removed; (12) home: tools (principles,
investing, net worth) grouped in one card at the end; Settings separates tools from app settings; shared HeroPanel and
StatusChip. Docs (README, store listing, checklist) updated. **Not changed (noted):** react-native-web shows the Switch
thumb outside its track in RTL (web preview only); deeper visual unification of list rows and badge sizes left for later.

### D-043 UI/UX polish: undo instead of confirm, back everywhere, one visual language — 2026-10-10
Owner request: raise UI and UX to 10/10. Measured against Nielsen's 10 heuristics and WCAG 2.2 AA with evidence per item
(docs/UX_SCORECARD.md; "10/10" = no known open gap, not user-validated). **Decision:** (1) snackbar with **Undo** after
quick add and after deleting an expense, replacing the "are you sure?" dialog (recover rather than interrupt); placed
above the tab bar and add button, announced to screen readers, inverse colours tested ≥ 4.5:1; (2) onboarding Setup and
Plan have Back (and Android back steps back instead of leaving); retaking the quiz says "Cancel", not "Skip all"; quiz
answers kept when going back; (3) compact EmptyState in cards (assets, obligations, holdings, budgets, goals — with an
"Add goal" action on Home); (4) tokens instead of raw numbers (spacing, info icon 16, badge 40, tab label 12); list amounts
use the `amount` style; Settings icons share the primary colour.

### D-044 Omani rial sign ⃄ (U+20C4) added; new signs default, classic switch in Settings — 2026-10-10
The owner supplied the published images of the new Omani rial, Saudi riyal and UAE dirham signs. Saudi (U+20C1) and
UAE (U+20C3) were already drawn from MIT fonts (D-038). **Decision:** the Omani sign is redrawn as clean vector
geometry matched to the published image (not a raster trace) and bundled as a tiny TrueType font (CurrencyOMR-Regular,
U+20C4 only; script in expo-app/scripts/omr-sign/). New signs are the default for OMR/SAR/AED; Settings → «رمز العملة»
switches back to «ر.ع.»/«ر.س»/«د.إ» for users who don't recognise the new signs yet. Screen readers can't read the new
characters, so text and amount labels speak the name («ريال عماني»). Replace the glyph with the official CBO vector
once published. Not verified on a real device.

### D-045 «شخصيتك المالية»: نمط سلوكي مقروء من سجلّ المستخدم وحده — 2026-10-10
الهدف المعلن من المالك: أن يفهم التطبيق **سلوك** المستخدم المالي، لا أن يعرض أرقامه فقط (العواصم المستهدفة: الرياض،
دبي، مسقط). **القرار:** محرّك `src/domain/persona.ts` يقرأ ثلاث سمات من المصروفات *اليومية* المسجلة (باستثناء السكن
والفواتير والاتصالات والتعليم والأقساط — وهي ثابتة لا تعبّر عن سلوك): نسبة الصرف في الأسبوع التالي للراتب، نسبة الصرف
في نهاية الأسبوع، ونصيب أكبر تصنيف. كل سمة تُقارن بـ«التوزيع المتساوي» (مثلًا ٧ أيام من ٣٠، أو يومان من ٧) وتُعدّ
«واضحة» عند تجاوزها ١٫٥ ضعفًا. النمط = أقوى سمة نسبةً إلى أساسها، وإلا «منتظم».
**قيود الأمانة:** لا حكم قبل ١٥ مصروفًا يوميًّا على مدى ٢١ يومًا على الأقل؛ كل رقم معروض محسوب من سجلّ المستخدم؛
**لا مقارنة بمستخدمين آخرين** لأننا لا نملك بيانات كهذه؛ لا شراء بيانات ولا خدمات مدفوعة.
**ذكاء محلي حقيقي:** نهاية الأسبوع تُؤخذ من العملة لأنها تختلف بين الخليج — الإمارات السبت/الأحد (منذ ٢٠٢٢)،
وعُمان والسعودية وقطر والكويت والبحرين الجمعة/السبت. يوم الراتب من خطة المستخدم، ويُقصّ إلى آخر يوم في الشهر الأقصر.
شاشة `/persona` تعرض النمط وسمةً واحدة قابلة للتنفيذ (حدّ على التصنيف/نهاية الأسبوع، أو تجنيب الادخار يوم الراتب).
اختبارات: `__tests__/persona.test.ts` (٧). لم يُختبر على جهاز حقيقي.

### D-046 تصحيح: Expo Go لا يستقبل تحديثات EAS — المعاينة على الهاتف تكون بخادم التطوير — 2026-10-10
**خطأ ارتكبته أنا:** في D-044 وما بعدها أرشدت المالك إلى `eas update --branch preview` لرؤية التغييرات على iPhone عبر
Expo Go، وكتبت في `app.config.ts` أن «Expo Go يحمّل التحديثات المنشورة بنفسه». هذا **غير صحيح**: هذا كان سلوك
`expo publish` القديم (المتقاعد). توثيق Expo ينصّ على أن التحديث المنشور بـ`runtimeVersion` **لا يُحمَّل في Expo Go**
وأن المطلوب **development build** عبر `expo-dev-client` (https://docs.expo.dev/build/updates/). لذلك ظلّ المالك يرى
النسخة القديمة مهما نشرنا — والسبب لم يكن `runtimeVersion` (e27cd88) ولا ذاكرة التخزين المؤقت.
**القرار:** (١) تصحيح التعليق في `app.config.ts`. (٢) المسار المعتمد للمعاينة اليومية على الهاتف هو **خادم التطوير**:
`npx expo start` ومسح رمز QR من Expo Go على نفس شبكة Wi‑Fi — يعمل فورًا وبلا تكلفة، وقد جرّبه المالك ونجح.
(٣) تثبيت نسخة على الجهاز بلا كمبيوتر يحتاج **development build**: مجاني على أندرويد (APK عبر EAS Build)، أما
iPhone فيستلزم حساب Apple Developer مدفوع — **لا يُفعَّل إلا بإذن المالك**. `eas update` يبقى مفيدًا لاحقًا، لكنه
يصل إلى تلك البناءات فقط لا إلى Expo Go.

### D-047 قراءة رسالة البنك: محرّك تحليل على الجهاز، والمشاركة لا الصلاحية — 2026-11-21
السؤال من المالك: «رسالة البنك تصل ← يضغط إضافة ← يُسجَّل المصروف». هذا أقوى اقتراح وصلني، لأن رسالة الخصم
في الخليج تصل **لكل** عملية ومجانًا، وتحلّ أكبر سبب للتسرّب (كسل التسجيل).
**الواقع التقني بلا تجميل:** iOS **لا يسمح** لأي تطبيق بقراءة الرسائل — لا توجد واجهة لذلك أصلًا، ولا حيلة.
أندرويد يسمح بصلاحية `READ_SMS`، لكن سياسة Google Play تقصرها على التطبيق المسؤول عن الرسائل (default SMS
handler)؛ وصفحة «معاينة» من Google تُدرج «إدارة المال عبر الرسائل» ضمن الاستخدامات المسموحة — معاينة لا نص نهائي،
والاعتماد عليها مخاطرة رفض.
**القرار — ثلاث مراحل:**
1. **المحرّك أولًا (مبني اليوم):** `src/domain/smsParse.ts` دالة نقية: نصّ الرسالة ← مبلغ، عملة، تاجر، آخر أربعة
   أرقام من البطاقة، ونوع العملية (شراء/سحب/تحويل/إيداع). ٩ اختبارات. قواعدها: ما لا يُفهم يُعاد `null` ولا يُخمَّن؛
   الإيداع والراتب يُميَّزان ولا يُسجَّلان مصروفًا؛ العملة الأجنبية تُعرض كما هي و**لا تُحوَّل** (لا نملك أسعار صرف
   ولن نختلقها)؛ رسائل رمز التحقق والرصيد والإعلانات تُرفض.
2. **المشاركة (بلا أي صلاحية، iOS وأندرويد):** يضغط المستخدم مطوّلًا على الرسالة ← مشاركة ← «ثروتي» ← شاشة
   مراجعة ← حفظ. ثلاث لمسات، وصفر مخاطر سياسات، ويعمل على الجهازين. هذه هي المرحلة التي نبنيها.
3. **التلقائي (أندرويد فقط، لاحقًا):** قراءة الرسائل بإذن صريح وإشعار فيه زر «إضافة». يُقدَّم على Google Play
   باستمارة تصريح، ويبقى **اختياريًّا**: التطبيق يعمل كاملًا بدونه.
**ما لا نفعله:** لا نرفع نصّ الرسالة إلى أي خادم، ولا نطلب إذن الرسائل عند أول تشغيل، ولا نعد iPhone بتلقائية
لا يسمح بها نظامه.

### D-048 مراجعة أداء بالمعايير الـ٣١: ثلاثة إصلاحات، وستة رفضتها بعد القياس — 2026-11-23
قائمة مراجعة أداء من ٣١ معيارًا، أغلبها مكتوب لتطبيقات الويب ذات الخوادم. **القرار: لا يُطبَّق معيار إلا بعد
قياس يثبت حاجتنا إليه.** النتيجة: ٦ مطبّقة أصلًا، **٣ أصلحتها**، ٦ فحصتها ورفضتها، ١٦ لا تنطبق (لا خادم ولا شبكة).
**ما أُصلح:** (١) **#٢٣ الافتراضية** — شاشة المصروفات كانت تُركّب كل صفوف الشهر داخل `ScrollView`؛ صارت `FlatList`
بترويسة تحوي ما فوق القائمة، والمسافات والتصميم كما هي بالضبط. (٢) **#١٦ التوازي** — عشرة `await` متتابعة في
`AppController.load` صارت `Promise.all` للمستقلة منها. (٣) **#٣١ اختبار الأداء** — `__tests__/perf.test.ts`
بميزانيات زمنية على ١٢ ألف مصروف، تكشف أي تراجع خوارزمي.
**ما رُفض بعد القياس، لا بالرأي:** `useMemo` في كل شاشة (الحسابات ٢–١٩ms)، تأخير البحث (٢ms على شهر ثقيل)،
هياكل التحميل (القراءة محلية بالمللي ثانية)، WebP (أيقوناتنا متجهات، وأصول المتجر PNG إلزامًا).
**ومرفوض مبدئيًّا: #٣٠ مراقبة المستخدم الحقيقي (RUM)** — يعني إرسال بيانات استخدام إلى خادم، وهو نقيض وعد
التطبيق وسياسة خصوصيته. لن يُضاف.
**المتبقي الأعلى أثرًا: #٢٩ تقليص الخطوط** (٦٩٤KB من IBM Plex Arabic) — لم أنفّذه لأن محرفًا ناقصًا يعني مربعًا
فارغًا في واجهة عربية، ويلزمه اختبار تغطية أولًا. التقرير الكامل: `docs/PERFORMANCE_REVIEW.md`.
لم يُقَس شيء على جهاز حقيقي.

### D-049 تقليص خطوط IBM Plex Arabic: ١٦٪ أصغر، مع اختبار تغطية يمنع المربعات الفارغة — 2026-11-23
البند الأعلى أولوية المتبقي من D-048. **النتيجة المقيسة: ٦٧٨KB ← ٥٧١KB (−١٠٧KB، ١٦٪).** الوفر متواضع لأن
IBM Plex Sans Arabic أصلًا عربي/لاتيني فقط؛ معظم الحجم رسوم حروف لا فائض.
**ما حُذف:** جدول أسماء الرموز `post` (~١٨KB لكل وجه، لا شيء يعرضها)، وامتدادات لاتينية وكسور ورموز رياضية
ومجموعات أسلوبية (`ss02`–`ss06`, `salt`, `subs`, `sups`) لا يستخدمها التطبيق.
**ما حُفظ عمدًا:** كامل كتل العربية **وأشكال العرض** (U+FB50–FDFF، U+FE70–FEFF) لأن نصوص رسائل البنوك
القديمة قد تحتوي عليها (D-047)؛ وميزات `init/medi/fina/mark/ccmp/rlig/calt/kern` التي بدونها تتفكك الكلمات
العربية؛ ونصّ رخصة OFL داخل الخط (الرخصة تسمح بالتقليص وتشترط بقاء الإشعار والاسم).
**الحماية من الخطأ:** `scripts/font-subset/verify.py` يفحص الوجوه الثلاثة ويفشل إن نقص محرف يظهر في أي **نص**
داخل الكود (التعليقات مستثناة عمدًا)، أو نقصت كتلة العربية، أو ضاعت ميزة وصل، أو ضاع إشعار الرخصة.
اكتشف الفحص فعلًا محرفين مفقودين (≈ و⇒) فأُضيفت نطاقاتهما قبل الاعتماد.
**دليل بصري:** `docs/screenshots/16-expenses-virtualized.png` — الحروف موصولة بعد التقليص، وهي نفسها الصورة
التي تُثبت أن تحويل شاشة المصروفات إلى `FlatList` (D-048) لم يغيّر التصميم.
الخطوط الأصلية تبقى في تاريخ git، والسكربت يعيد إنتاج النتيجة. لم يُقَس على جهاز حقيقي.

### D-050 قسم الاستثمار: لا يُحذف — يُعاد تأطيره تعليميًّا بحواجز مكتوبة في الكود — 2026-11-23
سؤال المالك: أيُحذف القسم أم تُعاد صياغته؟ **القرار: لا يُحذف.** القسم لا يوصي بمنتج ولا جهة، ولا يبيع، ولا
يعد بعائد، ولا يأخذ عمولة — وحذفه يُفقد المستخدم أهم ما يحميه: معرفة أن صندوق الطوارئ وسداد الفائدة يسبقان
أي استثمار. لكن مراجعة النصوص كشفت **خمس عبارات** تقترب من حدّ «التوصية الشخصية» المرخّصة، فأُزيلت:
1. **«جاهزيتك للاستثمار: X من 3»** ← **«أساسك المالي: X من 3»**. الفحوص نفسها (طوارئ، فائدة، فائض)، لكنها
   وصف لصحة مالية لا حكم بملاءمة الاستثمار للشخص (suitability) — وهو جوهر ما يتطلب ترخيصًا.
2. **«أساسك جاهز — يمكنك التفكير في الاستثمار»** ← سرد للحالة بلا دعوة: «الثلاثة مكتملة: …».
3. **«ويمكن تخصيص جزء منه للاستثمار»** (مع الفائض) ← حُذفت الدعوة تمامًا.
4. **حقل العائد كان مملوءًا مسبقًا بـ«4»** ← **فارغ**. رقم جاهز يُقرأ كتوقّع من التطبيق؛ الآن لا حساب قبل أن
   يكتب المستخدم افتراضه هو، وعنوان الحقل يقول «ليست رقمًا نقترحه». وعنوان البطاقة «ثمن الانتظار» (تحريض ضمني)
   صار **«أثر الوقت على مبلغ تجنّبه»**.
5. **أحكام شرعية قاطعة** («الصكوك هي الصيغة المتوافقة مع الشريعة») ← وصف بلا إفتاء: «تُطرح بصيغ يُقصد بها
   التوافق، ويقرّره هيئة شرعية للمنتج نفسه — لا نحن».
كما **نُقل إخلاء المسؤولية إلى أعلى الشاشة** (كان في الأسفل) ووُسّع ليشمل: لا توصية، ولا تقييم ملاءمة، وكل رقم
حسابُ المستخدم على افتراضه. واختبار جديد يفشل إن عاد الحقل ممتلئًا أو اختفى التنبيه.
**هذا لا يُغني عن المراجعة القانونية** (بند مفتوح في `LAUNCH_CHECKLIST.md`): هذه صياغة منتج، لا رأي قانوني،
والقرار النهائي لمحامٍ يعرف لوائح هيئة الخدمات المالية العُمانية.

### D-051 الرئيسية: ترتيب مبني على سلوك القرار لا على المحاسبة — 2026-11-23
الواجهة السابقة كانت صحيحة محاسبيًّا وخاطئة سلوكيًّا: أكبر رقم فيها «صافي التدفق الشهري» — رقم تقرير، لا رقم
قرار. من يفتح تطبيقًا ماليًّا يسأل **«كم أقدر أصرف اليوم؟»**، والشهر وحدة بعيدة عن لحظة الشراء.
**التغييرات الخمسة، ومبرر كل منها:**
1. **الرقم الكبير صار «متاح لك اليوم»** (محسوب أصلًا في `safeToSpend`) مع «حتى راتبك بعد N يومًا». الناس يقررون
   بأفق اليوم لا الشهر (present bias)، ويوم الراتب علامة زمنية أوضح من «نهاية الشهر» في الخليج.
   في الأشهر السابقة أو بلا دخل مسجّل، يبقى «صافي التدفق» هو العنوان — الرقم اليومي بلا معنى هناك.
2. **«المتبقي هذا الشهر» قبل «صُرف هذا الشهر»**: المتبقي يُقرأ كشيء يُحمى، والمصروف كشيء انتهى فلا يُؤثّر
   في قرار (loss aversion / sunk cost). وبطاقة «الدخل» المستقلة أُلغيت: الدخل ليس قرارًا، وكان أكثر رقم يُخلط
   برصيد البنك — وبقي ظاهرًا كسطر صغير تحت «المتبقي» للتأكيد («الدخل: ١٬٢٠٠٫٠٠٠»).
3. **«خطوتك التالية» صعدت فوق «سجّل بلمسة»**: قرار واحد قبل أي قائمة أدوات.
4. **سلسلة التسجيل** (`recordingStreak`): «سجّلت ٣ أيام على التوالي» تظهر فقط وهي قائمة، ولا تُعرض كإخفاق أبدًا،
   وعدم التسجيل اليوم لا يكسرها (تُحسب من الأمس) — تعزيز عادة لا محاسبة. وبدل «اليوم ٠٫٠٠٠ · آخر ٧ أيام ٠٫٠٠٠»
   (صفران يقرآن كفشل) صار «لم تسجّل شيئًا اليوم»، والأرقام تعود حين يكون فيها ما يُعرض.
5. **إزالة التكرار:** بطاقة «صحتك المالية» كانت تعيد الرقم اليومي نفسه؛ صارت تحمل الدرجة ووصفها فقط.
**حدود الادعاء:** هذه **مبادئ منشورة في علم السلوك** طُبّقت على ترتيب المعلومات — **وليست نتائج قياس على
مستخدمي التطبيق**. لم نقِس شيئًا على أحد، ولن أدّعي أثرًا. التحقق: ٣٥٣ اختبارًا تمرّ، واختبار الرئيسية حُدّث
ليثبت العقد الجديد (الرقم اليومي عنوانًا، والصافي باسمه وشهره وتعريفه خطوة أدنى، ولا يُقدَّم أيٌّ منهما كرصيد بنكي).
صور: `docs/screenshots/18-home-before-after.jpg` (قبل/بعد) و`18-home-after-1.png`، `18-home-after-2.png`.

### D-052 «شخصيتك المالية» ببوابتين، والأهداف بترتيب الاقتراب من النهاية — 2026-11-23
**١. البوابة الواحدة كانت جدارًا.** طلب المالك خفض الحد الأدنى. الحد السابق (١٥ مصروفًا على ٢١ يومًا) كان **أقل**
أصلًا من مثاله (٣ مشتريات يوميًّا × ٣ أسابيع = ٦٣)، لكن المشكلة الحقيقية لم تكن الرقم بل **أنها إما/أو**: المستخدم
يرى «سجّل قليلًا أكثر» بلا أن يعرف كم بقي. **القرار: بوابتان.**
- **قراءة مبدئية** عند ٨ مصروفات يومية على ١٠ أيام: النمط نفسه والسمات نفسها، لكن موسومة **«قراءة مبدئية»**
  مع «تستقر بعد ثلاثة أسابيع، وقد تتغيّر قبلها».
- **قراءة مستقرة** عند ١٥ مصروفًا على ٢١ يومًا كما كانت.
- وقبل البوابة الأولى: **شريطا تقدّم** («مصروفات يومية ٣ من ٨»، «أيام مغطّاة ٥ من ١٠») بدل رسالة مغلقة — العدّ
  التصاعدي يدفع للإكمال، والصدق محفوظ: لا حكم يُعطى قبل أوانه.
**لماذا لا ننزل أكثر؟** تحت ١٠ أيام لا يظهر إيقاع نهاية الأسبوع أصلًا (يومان من سبعة)، فأي «نمط» يُقال عندها
يكون ضجيجًا لا قراءة. هذا حدّ من طبيعة البيانات، لا تشدّدًا.
**٢. الأهداف: الأقرب للاكتمال أولًا** (goal gradient — الناس يسرّعون قرب خط النهاية). الترتيب: النشطة قبل
الموقوفة قبل المكتملة، وداخلها الأقل تبقيًا أولًا. وأضيف تحت كل شريط **«يتبقى X»** — الشريط يقول كم قطعت،
والسطر يقول ما بقي أن تضعه، وهو الرقم الذي يُتّخذ به قرار. ووسام **«الأقرب للاكتمال»** لا يظهر إلا من ٥٠٪ فأعلى:
وسام على هدف عند ٠٪ صحيح حرفيًّا وبلا معنى (ظهر فعلًا في أول لقطة واختبار، فأُصلح).
الصور: `docs/screenshots/19-persona-progress.png`، `19-persona-provisional.png`، `19-goals-nearest.png`.
٣٥٤ اختبارًا تمرّ. المبادئ سلوكية منشورة، لا نتائج قياس على مستخدمينا.

### D-054 مراجعة عدائية منهجية: ١٢ خطأً مثبتًا، أُصلحت كلها باختبارات انحدار — 2026-11-25
طلب المالك «١٠٠٠ ملاحظة من ١٠٠٠ مستخدم بعد ٦ أشهر». **رُفض اختلاق ملاحظات مستخدمين** (قاعدة المالك نفسه: لا
تختلق تقييمات مستخدمين) — لم يستخدم التطبيق أحدٌ بعد، ولا يومًا واحدًا. البديل المُنفَّذ: **مراجعة عدائية
منهجية** بأربعة فاحصين مستقلين، كلٌّ ملزم بدليل: رقم السطر، والمُدخل الكاسر، والناتج الخاطئ مقابل الصحيح.
فحصان نجحا (المنطق/التواريخ، والبيانات/الحالة) وأعطيا **١٢ خطأً مثبتًا**؛ وفحصا النصوص والشاشات توقّفا على
حدّ استخدام ولم يُنتجا شيئًا — **ولم يُدَّعَ لهما نتائج**.

**أخطاء التواريخ (تُصيب مستخدمين حقيقيين):**
1. `guidance.ts` «تصنيف يرتفع» كان يقارن ٣٠ أو ٣١ يومًا من الشهر الحالي بـ٢٨ يومًا من فبراير ← تنبيه «ارتفاع
   ١٠٠٪» بينما الصرف **انخفض للنصف**. يقع في ٧ أيام من السنة. الآن يُقصّ الطرفان عند اليوم نفسه.
2. `guidance.ts` «ادفع لنفسك أولًا» **ميت تمامًا** لمن راتبه يوم ٢٨–٣١: الحساب كان داخل الشهر الواحد، فصار
   الفرق سالبًا في أول أيام الشهر — وهو بالضبط وقت التنبيه. الآن يستخدم الحساب العابر للشهور.
3. `selectors.ts` و`persona.ts` كانا يحسبان الأيام بطرح ٢٤ ساعة: في مناطق التوقيت الصيفي (مصر، أوروبا،
   أمريكا) **يسقط يوم كامل** من مخطط الأسبوع، وتُقرأ سلسلة التسجيل ناقصة يومًا (أُثبت: ٩ بدل ١٠). أُضيف
   `addDays` في `core/dates.ts` يحسب بالتقويم لا بالمللي ثانية، واستُخدم في الثلاثة.
4. `smart.ts` بوابة «٢٠ يومًا» كانت تسقط ساعةً بعد تغيير الساعة فيختفي نمط الأيام كله. أُضيف تقريب لليوم.

**أخطاء الحالة وقاعدة البيانات:**
5. **تبديل الشهر كان يُلغى صامتًا**: من يبدّل الشهر ثم يحفظ قبل اكتمال التحميل يعود إلى الشهر السابق. أُضيف
   `pendingMonth` فصار أي تحميل لاحق يستهدف الشهر المقصود.
6. **إعادة التعريف كانت تغيّر العملة فوق بيانات قائمة**: كل المبالغ أعداد صحيحة بوحدات العملة الحالية، فتحويل
   OMR (٣ منازل) إلى SAR (٢) **يضرب كل رقم في التطبيق بعشرة**. الآن لا تتغيّر العملة ما دام هناك دخل أو مصروف.
7. وكانت تُعيد حدّ الميزانية إلى قيمة التعريف وتمحو تعديل المستخدم ← `INSERT OR IGNORE`.
8. **تصنيف مدمج كان يُحذف نهائيًّا** (لا يُعاد زرعه إلا في v1)، فيتعطّل «تسجيل سداد الالتزام كمصروف» إلى الأبد.
   الآن يُؤرشَف ولا يُحذف.
9. **دوران الشهر كان يُفقد** إذا استُؤنف التطبيق قبل جاهزيته. 10. تسريب اتصال قاعدة البيانات عند فشل بعد
   الفتح. 11. رفض غير ملتقط من تحميل جارٍ بعد إغلاق القاعدة. 12. نسخة احتياطية تُقرأ بعشر عمليات منفصلة فقد
   تتناقض جداولها؛ صارت لقطة واحدة داخل معاملة.

**ما رفضه الفاحصان صراحةً وكان سليمًا:** ترحيل v1→v2، المفاتيح الأجنبية، التصنيفات المؤرشفة في السجل، قيم
الإعدادات الافتراضية، حماية القسمة على صفر، `financeEngine` كاملًا، `core/currency` و`amountParser`،
ونوافذ «آخر ٣ أشهر».
**الاختبارات: ٣٦٧ (+١٣).** ملف `__tests__/dst.test.ts` يشغّل توقيت نيويورك لحراسة أخطاء التوقيت الصيفي.

### D-055 من تطبيق خليجي إلى تطبيق عربي: ٢٦ دولة، تقويم هجري، وأجهزة لوحية — 2026-11-25
التقييم الصادق في الرسالة السابقة قال إن التطبيق **خليجي لا عربي**: نصف دول الجامعة العربية خارج التغطية.
**ما نُفّذ:**
١. **العملات: ١٠ ← ٢٦.** كل عملات الجامعة العربية الـ٢٢ موجودة الآن (العراق، المغرب، تونس، الجزائر، ليبيا،
   لبنان، سوريا، السودان، اليمن، موريتانيا، الصومال، جيبوتي، جزر القمر، فلسطين) مع أُسُسها من ISO 4217:
   ثلاث منازل لدنانير الخليج وتونس وليبيا والعراق، و**صفر منازل** للفرنك الجيبوتي والقمري — وأُضيف اختبار
   يثبت أن عملة بلا كسور تحفظ الأرقام صحيحة بلا اختراع منازل.
٢. **«بلدك» إعداد مستقل عن العملة** (`src/core/countries.ts`). الاستنتاج القديم من العملة كان خطأً مفاهيميًّا:
   العملة ليست بلدًا (من يحمل الدولار قد يكون في أي مكان)، وعدة دول تتشارك عملة. نهاية الأسبوع الآن من البلد:
   الجمعة/السبت في عُمان والسعودية والعراق ومصر…، والسبت/الأحد في الإمارات والمغرب وتونس والجزائر ولبنان
   وجزر القمر. ومن لم يختر بلدًا بعد: تُستنتج من العملة، وإن لم تُعرف فالسبت/الأحد (الأشيع عالميًّا).
٣. **التقويم الهجري** تحت اسم الشهر في كل شاشة (`hijriMonthLabel`). مبني على تقويم النظام (أم القرى) لا على
   جدول مضمّن: الجدول يحتاج تمديدًا يدويًّا كل بضع سنوات ثم يُخطئ صامتًا. وإن لم يملك الجهاز البيانات —
   بعض نسخ أندرويد — **لا يُعرض شيء** بدل عرض تاريخ ميلادي بثوب هجري (الدالة تتحقق أن الناتج ليس ميلاديًّا).
٤. **الأجهزة اللوحية والوضع الأفقي**: `supportsTablet: true` و`orientation: default`، مع **حدّ عرض للقراءة
   (٧٢٠)** يُوسّط العمود بدل تمديده عبر شاشة iPad — طول السطر وأعمدة المبالغ تبقى مقروءة.
**ما لم يُنفَّذ بعد:** الفرنسية (لازمة للمغرب العربي) — ترجمة ٤٦٠+ نصًّا تحتاج مراجعة ناطق بالفرنسية قبل
الإطلاق، ولن أنشر ترجمة آلية في منتج مالي. الاختبارات: ٣٧٠.

### D-056 أحجام الأزرار: مقاسان بدل مقاس واحد، وزر عائم دائري — 2026-11-25
ملاحظة المالك على أحجام الأزرار صحيحة، والدليل في اللقطات نفسها: **الزر العائم كان يغطّي أزرار «خطوتك التالية»**
في كل لقطة للرئيسية تقريبًا. السبب أن كل الأزرار كانت بمقاس واحد (٤٨ ارتفاعًا و٢٤ حشوًا جانبيًّا)، والزر العائم
شريطًا عريضًا يحمل كلمة «إضافة مصروف».
**ما تغيّر:**
١. **مقاسان:** `md` (٤٨) للقرار الحقيقي، و`sm` (٤٠) للإجراءات الثانوية داخل البطاقات («ليس الآن»، «عرض الكل»،
   «إضافة مبلغ»، «سحب»). والمقاس الصغير **يحتفظ بهدف لمس ٤٨** عبر `hitSlop` — يبدو أصغر فقط، ولا يصعب لمسه.
٢. **أزرار بلا خلفية** (`text`/`danger`) حشوها الجانبي صار ١٢ بدل ٢٤: لا معنى لبرميل فراغ حول نصّ بلا خلفية.
٣. **الزر العائم دائري ٥٦×٥٦** بأيقونة فقط: مساحته صارت نحو **خُمس** ما كانت، فلم يعد يغطّي شيئًا. والكلمة
   باقية اسمًا لقارئ الشاشة وفي الضغط المطوّل، وهدف اللمس ٥٦ أي فوق الحد.
٣٧٠ اختبارًا تمرّ. صورة قبل/بعد: `docs/screenshots/22-buttons-before-after.jpg`.
