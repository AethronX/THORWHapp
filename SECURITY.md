# Security — Tharwati v0.1

No security certification or legal compliance is claimed. This is an initial engineering threat
model for a **local-only** app; it must be redone before adding accounts, sync, payments or AI.

## Assets
Personal financial records (income, expenses, notes, goals) in an app-private SQLite file.

## Attack surface (v0.1)
| Surface | State |
|---|---|
| Network | **None** in release builds (no INTERNET permission). Debug/profile only, for tooling |
| Server / API keys / secrets | None exist. `.env.example` documents that; `.env*`, keystores, `key.properties` are git-ignored |
| Third-party runtime packages | `sqflite` (+ Flutter SDK `intl`, `path`, `flutter_localizations`). No analytics/ads/crash SDKs |
| Input | Typed amounts, names, notes → parsed/validated; all SQL parameterised; DB CHECK + FK constraints |
| Storage | App sandbox; no cloud backup / device transfer on Android |
| Logs | Errors are not logged; no amounts or notes in any output |

## Threats and mitigations
| # | Threat | Mitigation | Residual |
|---|---|---|---|
| T1 | Malformed input corrupts balances | String→int parser (no floats), currency-exponent checks, ambiguity rejected (`12,500`), repository checks + SQL CHECK constraints | Low |
| T2 | SQL injection | Only parameterised queries; no string-built SQL | Low |
| T3 | Data leak via cloud backup | Android: `allowBackup=false` + data-extraction rules | **iOS: open (R-1)** |
| T4 | Data leak via logs/crash reports | No logging of payloads; no crash SDK | Low |
| T5 | Physical access to unlocked/rooted phone | OS sandbox + device encryption only | **R-2** |
| T6 | Data loss from upgrades/downgrades | Append-only migrations in a transaction; newer-schema DB refused, never wiped | Medium until on-device migration tests exist |
| T7 | Misleading financial output (harm to user) | Deterministic engine with independent tests; hypothetical labels + disclaimer; overflow reported as out-of-range | Low |
| T8 | Tampered release / stolen signing key | Play App Signing + offline upload key (RELEASE.md) | **R-3** until configured |
| T9 | Feature unlocking by tampering | No paid features exist. Future: server-verified entitlements, not hidden buttons | n/a |

## Independent review — 2026-10-09
A separate review agent (read-only) audited `lib/`, manifests and build files. No critical findings.
Disposition:

| Sev | Finding | Status |
|---|---|---|
| High | `,` silently stripped → `1,5` read as 15 | **Fixed**: comma rules + tests (`amount_parser_test.dart`) |
| High | iOS: DB in Documents is included in iCloud backup, contradicting privacy text | **Open (R-1)** — iOS is not a v1 target; must fix before any iOS build |
| Medium | Future-dated expenses saved but unreachable | **Fixed**: date picker capped at today |
| Medium | Viewed month stale after month rollover → expenses default to last month | **Fixed**: `onResumed` follows the new month (tested) |
| Low | Huge calculator results clamped to int64 max | **Fixed**: > 2^53 → out-of-range error (tested) |
| Low | Failed delete-all left app half-closed | **Fixed**: `try/finally` reopen |
| Low | Onboarding writes not atomic | **Fixed**: single transaction (tested) |
| Low | "Months left" ignored the day of month | **Fixed**: counts month-end deposits on/before target (tested) |
| Low | Renaming built-in category froze language | **Fixed**: prefill only custom names |
| Low | Goal-at-risk evaluated on past months | **Fixed** (tested) |
| Low | Release build signed with debug key | **Open (R-3)** — owner action, RELEASE.md |
| Low | Income delete without confirmation; "already saved" rejected 0; 99.6 % shown as 100 % | **Fixed** |
| Low | Dialog `TextEditingController`s not disposed | Accepted: disposing right after `showDialog` returns can crash during the exit animation; controllers are GC'd with the closure |

## Residual risks (open)
- **R-1 iOS backup.** Move DB to Application Support and set `NSURLIsExcludedFromBackupKey` (needs a
  small native call or plugin) before any iOS release.
- **R-2 No encryption at rest / no app lock.** Consider SQLCipher-based storage and biometric/PIN lock
  (P1). Note encryption is not a substitute for access control once sync exists.
- **R-3 Release signing not configured.** See RELEASE.md.
- **R-4 Not tested on a real device.** Device-only behaviours (sqflite on Android, IME, date picker,
  TalkBack) are unverified.

## Before adding network features
Threat-model again; HTTPS only (no cleartext), certificate validation, per-user authorisation with
negative tests (user A cannot read user B), rate limits, server-side input validation, secrets only on
the server, dependency audit, and update PRIVACY.md + Play Data safety.

## Reporting
Report vulnerabilities privately to the repository owner (e.g. GitHub private vulnerability
reporting) rather than in a public issue.
