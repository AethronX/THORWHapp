# Monetization plan (P2 — not implemented)

Status: **no billing code exists.** Prices below are hypotheses to test, not commitments.

| Plan | Target price | Product ID (proposed) |
|---|---|---|
| Free | 0 | — |
| Plus Monthly | 0.99 USD | `plus_monthly` (subscription, base plan `monthly`) |
| Plus Annual | 9.99 USD | `plus_annual` (subscription, base plan `annual`) |
| Lifetime (founding) | to be tested | `plus_lifetime` (one-time, non-consumable) |

Local prices come from Google Play (`ProductDetails`), never hard-coded in UI.

## Free vs Plus (hypothesis, to validate with users)
Free must remain genuinely useful: income, expenses, categories, budgets, goals, calculator,
rule-based insights, delete-all. Plus candidates: multiple scenario comparison, debt plan, reports and
export, net-worth history, reminders, optional AI coach. Avoid paywalling data the user already
entered (export must always be possible for privacy/portability).

## Design (when scheduled)
- One `EntitlementService` interface (`Stream<Entitlements>`), with a `FreeEntitlementService`
  default and a Play Billing adapter (`in_app_purchase` official plugin — confirm current version and
  Play Billing Library requirement at implementation time).
- A single product catalog (IDs ↔ entitlement), separate from display strings.
- Purchase states handled: pending, purchased, cancelled, error, restored, refunded/revoked,
  expired, grace period / account hold.
- **Server-side verification** of purchase tokens (Google Play Developer API) + Real-time developer
  notifications. Requires a small backend with the service-account key in its secret store, never in
  the app. Until that exists, client-side state is a convenience cache only and must not be trusted
  for anything beyond UI.
- Entitlement checks gate features in the controller/service layer, not by hiding buttons.

## Prerequisites before any real sale (owner actions)
1. Play Console merchant/payments profile for the developer account, with Oman (and target markets)
   supported for payouts — verify.
2. Licence testers configured; test purchases verified end-to-end.
3. Terms of sale, refund policy, and lifetime-plan terms ("lifetime of the product", supported
   features) reviewed legally.
4. No external payment links for digital features unless Play policy for the market allows it.
