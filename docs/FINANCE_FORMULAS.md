# Finance engine — formulas, units, edge cases

Source: `lib/domain/finance/finance_engine.dart` (pure Dart, no Flutter, no clock, no I/O).
Tests: `test/domain/finance_engine_test.dart`.

## Conventions (apply to every function)

| Topic | Rule |
|---|---|
| Money unit | `int` **minor units** of the active currency (OMR: 1 rial = 1000 baisa; USD: 100 cents). Never `double` at rest. |
| Intermediate maths | `double` for compound growth only; result rounded **once** at the end. |
| Rounding | Half away from zero (`roundMinor`). Exception: amounts the user must *pay in* to reach a goal round **up** (ceil), so following the advice actually reaches the goal. |
| Rates | Annual **nominal** %, compounded **monthly**: `r = annual% / 100 / 12`. |
| Deposits | End of each month (ordinary annuity). |
| Inflation | Effective annual rate, compounded annually (fractional years allowed: `(1+i)^(months/12)`). |
| Before/after | All results are **before fees and taxes**. Nominal unless the name says "real". |
| Hypothetical returns | Illustrations only. The UI always shows the 0 % "saving only" figure next to any return scenario, labels growth as "hypothetical", and shows a disclaimer. |
| Input limits | Amounts ≥ 0; months 0..1200; return rate 0..100 %; inflation −50..100 %. Violations throw `FinanceInputError`. User input is capped at 999,999,999 major units, so all values stay far below 2^53 (exact in doubles). |

## Functions

| Function | Formula | Edge cases |
|---|---|---|
| `sumMinor` | Σ amounts (integer, exact) | empty → 0 |
| `netCashFlow` | income − expenses | may be negative; negative inputs rejected |
| `savingsRate` | (income − expenses) / income | income = 0 → `null` (undefined, UI shows "—"); may be negative |
| `projectedCashBalance` | start + net × months | **no growth**; cash only |
| `futureValue` | `FV = P(1+r)^n + PMT((1+r)^n − 1)/r`; r = 0 → `P + PMT·n` | n = 0 → P. Returns contributions, value, and hypothetical growth separately so cash and assumed return are never mixed |
| `compareScenarios` | `futureValue` per rate | contributions identical across scenarios |
| `realValue` | nominal / (1 + i)^(months/12) | i = 0 or n = 0 → identity; deflation increases value |
| `requiredMonthlySaving` | remaining = T − S(1+r)^n; r = 0 → ⌈remaining / n⌉; r > 0 → ⌈remaining · r / ((1+r)^n − 1)⌉ | reached (S ≥ T, or S grows past T) → 0; n = 0 → whole remaining due now |
| `goalProgress` | saved / target clamped 0..1 | target ≤ 0 → 1 |
| `emergencyFund` | target = essential × months (default 6); gap = max(0, target − saved); coverage = saved / essential | essential = 0 → coverage `null`; months 1..24 |
| `debtPayoff` | monthly loop: interest = round(balance × r); balance += interest; pay min(payment, balance) | payment ≤ first interest → `paysOff = false` (never ends); 0 balance → 0 months; cap 1200 months. Assumes fixed rate, no fees, no new borrowing |

Goal "months left" (`monthsUntil` in `lib/core/dates.dart`) = number of **month-end deposits on or
before the target date**, starting with the current month's end (consistent with end-of-month
deposits): from 9 Oct 2026 → 1 Apr 2027 = 6, → 30 Apr 2027 = 7, → 31 Oct 2026 = 1,
→ 20 Oct 2026 = 0 ("due this month": the whole remainder is due now).

Results whose magnitude exceeds 2^53 minor units throw `FinanceInputError` (shown as "out of range")
instead of being silently clamped.

## Independent reference values

Test expectations were produced with this Python script (50-digit `decimal`), not with the Dart engine:

```python
from decimal import Decimal as D, getcontext, ROUND_HALF_UP, ROUND_CEILING
getcontext().prec = 50
q = lambda x: int(x.quantize(D(1), rounding=ROUND_HALF_UP))
c = lambda x: int(x.quantize(D(1), rounding=ROUND_CEILING))
def fv(P, PMT, n, a):
    r = D(a) / D(1200)
    if r == 0: return P + PMT * n
    g = (1 + r) ** n
    return q(D(P) * g + D(PMT) * (g - 1) / r)
def req(T, S, n, a):
    r = D(a) / D(1200)
    if r == 0: return c(D(T - S) / n)
    g = (1 + r) ** n
    return c((D(T) - D(S) * g) * r / (g - 1))
def debt(B, a, P):
    r = D(a) / D(1200); bal = B; it = paid = 0
    for m in range(1, 1201):
        i = q(D(bal) * r)
        if P <= i: return ('never', m)
        it += i; bal += i; pay = min(P, bal); bal -= pay; paid += pay
        if bal == 0: return (m, it, paid)
print(fv(0, 100000, 120, 5))             # 15528228  (100 OMR/month, 10 y, 5 %)
print(fv(1000000, 0, 12, 12))            # 1126825
print(fv(500000, 50000, 360, 7))         # 65056799
print(req(10000000, 1000000, 36, 6))     # 223798
print(q(D(1000000) / D('1.02') ** 10))   # 820348
print(debt(1000000, 12, 100000))         # (11, 58985, 1058985)
print(debt(3000000, 18, 150000))         # (24, 593479, 3593479)
```

The first value matches published annuity tables (100/month, 10 years, 5 % → 15,528.23).

## What the engine deliberately does not do
- No product, fund, stock or bank recommendations; no "expected return" defaults beyond the user's own input.
- No tax or zakat calculation (needs separate legal/religious review).
- No currency conversion (amounts are single-currency, see DECISIONS D-005).
