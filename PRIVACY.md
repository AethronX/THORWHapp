# Privacy — Tharwati v0.1

This is the engineering privacy design, **not** a legal privacy policy. A public policy for Google Play
must be written and reviewed (Oman Personal Data Protection Law, Royal Decree 6/2022, and its
executive regulations; plus GDPR-style laws for later markets) before any public release.

## Data inventory

| Data | Why | Where | Leaves device? |
|---|---|---|---|
| Income lines (amount, month, label) | Monthly cash flow | SQLite in app-private storage | No |
| Expenses (amount, category, day, note) | Spending tracking | same | No |
| Budgets, goals, goal contributions | Planning | same | No |
| Settings (currency, language, theme, onboarded) | App behaviour | same | No |

Not collected: name, email, phone, national ID, location, contacts, bank credentials, device
identifiers, advertising ID. No analytics SDK, no crash-reporting SDK, no ads.

## Guarantees in the current build
- Release manifest has **no INTERNET permission** — the app cannot transmit data.
- Android cloud backup and device-to-device transfer of app data are **disabled** (`allowBackup=false`,
  `res/xml/data_extraction_rules.xml`).
- No logging of amounts or notes (`runGuarded` and `AppController.init` swallow error payloads).
- "Delete all my data" (Settings → Privacy) closes and deletes the database file, then returns to
  first-run onboarding. Covered by the end-to-end test.
- Uninstalling the app removes all data.

## Retention
Data is kept until the user deletes it (per item, per goal, or all) or uninstalls. There is no
server copy and therefore no server retention.

## Known limitations
- The SQLite file is not encrypted at rest beyond Android's per-app sandbox and device encryption.
  A rooted device or a device without a screen lock exposes it. See SECURITY.md (R-2).
- No app lock (PIN/biometric) yet — P1 candidate.
- No export yet, so users cannot take their data elsewhere (P1). Required before claiming data
  portability.

## When this changes
Any of these require updating this file, the Play Data Safety form, and the public policy first:
adding INTERNET, analytics, crash reporting, accounts, sync, AI features, or payments.
Analytics rules: docs/METRICS.md.
