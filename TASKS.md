# Tasks

Owner = accountable role (from the 20-role model). "Owner action" = needs the product owner
(accounts, money, legal, devices) and cannot be done from the dev container.

## Done (slice 1 — 2026-10-09)
| Task | Owner role | Evidence |
|---|---|---|
| Environment audit, Flutter 3.47.5 install | DevOps | PROJECT_STATUS.md |
| Architecture & layering | Flutter Architect / CTO | ARCHITECTURE.md |
| Finance engine + independent reference tests | Financial Calculation Eng. | docs/FINANCE_FORMULAS.md, 32 tests |
| SQLite schema v1, constraints, migrations framework | Database Eng. | repository_test.dart |
| Amount parsing (no floats, Arabic digits) | Flutter Eng. B | amount_parser_test.dart |
| Design tokens, light/dark, components | UI/UX Designer | tokens.dart, contrast tests |
| Onboarding, dashboard, expenses, income, budgets, goals, calculator, settings, categories | Flutter Eng. A/B/C | journey_test.dart |
| Arabic + English, RTL/LTR | Localization Eng. | ARB files, LTR test |
| Rule-based insights | Product / Financial Calc. | insights_test.dart |
| Delete-all, backup disabled, no INTERNET in release | Privacy Eng. | PRIVACY.md |
| Accessibility checks (contrast, tap targets, 2× text) | Accessibility Specialist | accessibility_test.dart |
| Independent QA/Security review | QA Lead / Security Eng. | SECURITY.md |

## Next (ordered by risk)
| # | Task | Owner | Blocker |
|---|---|---|---|
| 1 | Build APK/AAB and run on a real device; fix any device-only issues | DevOps | **Owner action:** machine with Android SDK (or a container network policy allowing dl.google.com + maven.google.com) |
| 2 | Release signing via `key.properties`; remove debug signing from release | DevOps | Owner action: create & safeguard upload key |
| 3 | TalkBack pass + fix semantics issues | Accessibility | Device |
| 4 | Watch first CI run (workflow added: format, analyze, test) | DevOps | runs on push |
| 5 | Export/import (JSON + CSV) | Flutter Eng. C / Privacy | none |
| 6 | Emergency-fund and debt-plan screens (engine ready) | Flutter Eng. A | none |
| 7 | App lock (biometric/PIN) | Auth & Privacy | plugin evaluation |
| 8 | Monthly report | Flutter Eng. A | none |
| 9 | Launcher icon + splash in brand colours | UI/UX | brand assets (owner) |
| 10 | Usability test script for closed beta | UX Researcher | testers (owner) |
| 11 | Play listing, privacy policy, Data safety form | PM / Legal | Owner action: Play account, legal review |
| 12 | Decide final application ID | PM / CTO | Owner decision before first upload |

## Open questions for the owner
1. Final application ID (currently `om.tharwati.tharwati`) and legal entity for the Play account.
2. Who are the first closed-test users and how will consent be collected?
3. Preference on Western vs Arabic-Indic digits (currently Western in both languages).
