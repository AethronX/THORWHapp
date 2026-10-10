import type { PrincipleResult } from '../domain/principles';
import { formatPercent } from './format';
import type { Strings } from './i18n';

/** The user's situation for one principle, in words, with their own numbers. */
export function principleText(r: PrincipleResult, s: Strings, money: (m: number) => string, catName: (id: number) => string): string {
  switch (r.key) {
    case 'payYourselfFirst':
      return r.rate == null ? s.pPayFirstNoData : s.pPayFirst(formatPercent(r.rate));
    case 'roomForError':
      return r.months == null ? s.pRoomNoData : s.pRoom(s.monthsApprox(Math.floor(r.months * 10) / 10), money(r.liquidMinor), money(r.monthlyEssentialMinor));
    case 'measureWealth':
      return r.netMinor == null ? s.pMeasureNoData : s.pMeasure(money(r.netMinor));
    case 'assetsVsLiabilities':
      if (r.status === 'needsData') return s.pAssetsNoData;
      return r.paymentsMinor === 0 && r.status === 'good' ? s.pAssetsGood : s.pAssets(money(r.paymentsMinor), r.share == null ? null : formatPercent(r.share));
    case 'debtFocus':
      if (r.status === 'needsData') return s.pDebtNoData;
      if (!r.snowball || !r.avalanche) return s.pDebtGood;
      if (r.openDebts === 1) return s.pDebtOne(r.snowball.name);
      if (r.snowball.id === r.avalanche.id) return s.pDebtSame(r.snowball.name);
      return s.pDebt(r.snowball.name, r.avalanche.name);
    case 'consciousSpending':
      if (r.status === 'needsData') return s.pConsciousNoData;
      return r.categoryId == null ? s.pConsciousGood : s.pConscious(catName(r.categoryId), formatPercent(r.share));
  }
}
