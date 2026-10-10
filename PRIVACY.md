# Privacy — Tharwati (Expo app, v0.9)

Engineering privacy design. The **public** policy draft is `docs/PRIVACY_POLICY_AR.md` and must be reviewed
by a lawyer (Oman Personal Data Protection Law, Royal Decree 6/2022, and its executive regulations) before
release. The old Flutter build's statement ("no INTERNET permission") does **not** apply to the Expo app.

## Data inventory — all stored only in the app's private SQLite database on the device
| Data | Why |
|---|---|
| Income lines, expenses (amount, category, date, note) | Cash flow, budgets, analytics |
| Categories, budgets | Planning |
| Savings goals, contributions, pause flag | Goals |
| Obligations (name, remaining, rate, monthly payment, due day) and payments | Payoff plans, net worth |
| Assets (name, type, value, "estimate" flag, date) | Net worth |
| Questionnaire answers (goal, income type, payday, focus category, saving habit) | Personal plan, guidance |
| Settings (currency, language, theme, app lock, hide amounts, haptics, dismissed tips) | App behaviour |

Not collected: name, email, phone, national ID, location, contacts, photos, bank credentials, device or
advertising IDs. **No accounts, no server, no sync, no analytics SDK, no crash-reporting SDK, no ads, no AI service.**

## Permissions (Android manifest, verified with `expo config --type introspect`)
| Permission | Why |
|---|---|
| `INTERNET` | Required by Expo's update mechanism (`expo-updates`). Installed builds use `checkAutomatically: NEVER`, and the app has no code that sends user data anywhere. |
| `VIBRATE` | Haptic feedback (can be turned off in Settings). |
| `USE_BIOMETRIC`, `USE_FINGERPRINT` | Optional app lock; the OS performs the check, the app stores no biometric data. |
| Removed: `SYSTEM_ALERT_WINDOW`, `READ/WRITE_EXTERNAL_STORAGE` | Added by Expo by default; not needed — blocked in `app.json`. |
iOS: Face ID usage text is declared; no other protected resources are used.

## Guarantees in the current build
- Android cloud backup is disabled (`allowBackup: false`).
- No logging of amounts or notes (errors are swallowed without their payload).
- **Export** (Settings → Export your data) writes a JSON/CSV file to the app cache and opens the system
  share sheet — the **user** chooses where it goes. Restore is not available yet (stated on screen).
- **Delete all my data** closes and deletes the database, then returns to first run (end-to-end test).
- **App lock** (optional): asked on cold start and after > 60 s in the background; no data is drawn before it.
- **Hide amounts** masks every amount on screen and in screen-reader text.
- Uninstalling the app removes all data.

## Known limitations
- The database is protected by the OS app sandbox and device encryption, not encrypted separately
  (SECURITY.md R-2). A device without a screen lock is weaker.
- No restore from a backup file yet.

## When this changes
Adding analytics, crash reporting, accounts, sync, AI features, bank connections or payments requires updating
this file, the store Data-safety / App-privacy forms and the public policy **first**. Analytics rules: docs/METRICS.md.
