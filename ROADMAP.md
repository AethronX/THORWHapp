# Roadmap

Target: Android closed beta in **November 2026**, *if* a Play developer account, signing, and
on-device testing are in place (see RELEASE.md). Dates are goals, not commitments.

## Phase A — Build P0 & internal test (Oct–Nov 2026)  ← **we are here**

| # | P0 feature | Status |
|---|---|---|
| 1 | Welcome / value intro | ✅ built, tested |
| 2 | Currency setup (OMR default, 10 currencies) | ✅ |
| 3 | Monthly income | ✅ (per-month lines + copy last month) |
| 4 | Add / edit / delete expenses | ✅ |
| 5 | Editable categories | ✅ add / rename / delete-or-archive |
| 6 | Income, expenses, net cash flow, savings rate | ✅ |
| 7 | Monthly budget | ✅ per-category recurring limits |
| 8 | Savings goal with target amount + date | ✅ with deposits/withdrawals |
| 9 | Savings & compound calculator with stated assumptions | ✅ 0 % vs hypothetical rate + inflation |
| 10 | Clear progress display | ✅ labelled progress bars (text, not colour only) |
| 11 | Reliable persistence | ✅ SQLite + constraints + migrations; restart tested |
| 12 | Full Arabic RTL UI | ✅ (+ English LTR) |
| 13 | Error / empty / loading states | ✅ |
| 14 | Finance calculation tests | ✅ independent references |
| 15 | Privacy settings & delete data | ✅ delete-all; backup disabled |

Remaining in Phase A (owner + device needed): Android SDK build, on-device run, TalkBack pass,
release signing, Play internal track. See TASKS.md.

## Phase B — Closed test with real users (Nov–Dec 2026)
Recruit testers in Oman with consent; usability sessions on "first expense in < 2 min";
interviews; Play vitals. No fabricated numbers in reports (docs/METRICS.md).

## Phase C — Retention & P1 (Q1 2027)
P1 candidates in order: export/import (CSV/JSON — also restores phone-migration path) · emergency
fund screen (engine done) · debt payoff plan (engine done) · monthly report · multiple scenario
comparison · net-worth log · user-chosen reminders · app lock · rule-based coach expansion.
Then decide on paid plans based on Phase B evidence (docs/MONETIZATION.md).

## Phase D — Growth (2027+)
P2: optional AI assistant (server-proxied), subscriptions, secure sync, GCC-specific features
(multi-currency, local banks' salary dates, GOSI/PASI-style deductions after legal review), iOS.

## Not planned
Bank credential collection or bank linking (v1), securities buy/sell recommendations, guaranteed
return claims.
