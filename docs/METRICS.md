# Success metrics (definitions + hypotheses)

Status: **no analytics is implemented** and the release build has no network access, so none of
these can be measured yet. Every target below is a **hypothesis to test**, not a result.

## Definitions

| Metric | Definition | Hypothesis (to validate in closed test) |
|---|---|---|
| Onboarding completion | users reaching the dashboard / users opening the app | ≥ 70 % |
| Time to first value | first launch → first expense **or** income saved | median < 2 min |
| Goal adoption | users with ≥ 1 goal / activated users, by day 7 | ≥ 30 % |
| Weekly active | users with ≥ 1 write action in a week | — (baseline first) |
| D7 / D30 retention | users active on day 7 / 30 after install | — (baseline first) |
| Crash-free users | from Play Console vitals (no SDK needed) | ≥ 99.5 % |
| Conversion to Plus | after billing exists | — |
| Cancellations / refunds | from Play Console reports | — |

## Measurement plan (order of preference)
1. **Play Console** (installs, uninstalls, vitals, ratings) — available with zero code.
2. **Closed-test interviews and a short in-app feedback link** — qualitative.
3. **Opt-in, privacy-preserving events** (only if 1–2 aren't enough), behind an `Analytics`
   interface with a no-op default:
   - Allowed: event name, app version, locale, coarse counts (e.g. `goal_created`).
   - Never: amounts, notes, category names typed by the user, goal names, precise timestamps
     beyond day, device identifiers. No third-party ad/attribution SDKs.
   - Requires: INTERNET permission, updated PRIVACY.md, Play Data safety update, consent screen.

Reports must label each figure as *measured* (with source and date) or *hypothesis*.
