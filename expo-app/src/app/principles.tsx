import { router } from 'expo-router';
import { View } from 'react-native';

import { principleScore, PrincipleResult } from '../domain/principles';
import { isViewingCurrentMonth, principles } from '../state/selectors';
import { useAppState, useUi } from '../ui/AppContext';
import { Button, Card, CurrentMonthOnly, HeroPanel, Icon, Row, Screen, StatusChip, T } from '../ui/components';
import { haptic } from '../ui/feedback';
import { categoryLabel } from '../ui/format';
import { principleText } from '../ui/principlesText';
import { Radii, Space } from '../ui/theme';

/**
 * "Wealth principles": six well-known ideas from popular money books, each
 * checked against the user's own data, with a clear status and one action
 * (src/domain/principles.ts, D-040).
 */
export default function Principles() {
  const st = useAppState();
  const { s, p } = useUi();
  const results = principles(st);
  const score = principleScore(results);
  if (!isViewingCurrentMonth(st))
    return (
      <Screen testID="principles">
        <CurrentMonthOnly />
      </Screen>
    );

  return (
    <Screen testID="principles">
      <HeroPanel>
        <Row gap={Space.xs}>
          <Icon name="book" size={20} color={p.heroAccent} />
          <T variant="label" color={p.heroAccent}>
            {s.principlesTitle}
          </T>
        </Row>
        <T variant="title" color={p.onHero} testID="principles.score">
          {score.judged === 0 ? s.principleStatus.needsData : s.principlesScore(score.good, score.judged)}
        </T>
        <T variant="small" color={p.onHeroMuted}>
          {s.principlesIntro}
        </T>
      </HeroPanel>
      {results.map((r) => (
        <PrincipleCard key={r.key} r={r} />
      ))}
      <T variant="small" muted testID="principles.disclaimer">
        {s.principlesDisclaimer}
      </T>
    </Screen>
  );
}


function PrincipleCard({ r }: { r: PrincipleResult }) {
  const st = useAppState();
  const { s, p, money } = useUi();
  const catName = (id: number) => {
    const c = st.categoriesById.get(id);
    return c ? categoryLabel(c, s) : s.otherSlice;
  };
  const text = principleText(r, s, money, catName);

  const act = () => {
    haptic.tap();
    const a = r.action;
    switch (a.type) {
      case 'openGoals':
        return router.navigate('/goals');
      case 'openWealth':
        return router.push('/wealth');
      case 'addIncome':
        return router.push('/income');
      case 'reviewBudgets':
        return router.push('/budgets');
      case 'setBudget':
        return router.push({ pathname: '/budgets', params: { focus: String(a.categoryId) } });
    }
  };
  const actLabel = { openGoals: s.pActGoals, openWealth: s.pActWealth, addIncome: s.pActIncome, reviewBudgets: s.pActBudgets, setBudget: s.pActLimit }[r.action.type];

  return (
    <Card testID={`principle.${r.key}`}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, gap: Space.xs }}>
          <T variant="subtitle">{s.principleIdea[r.key]}</T>
          <Row gap={Space.xs}>
            <Icon name="book" size={14} color={p.textSubtle} />
            <View style={{ flex: 1 }}>
              <T variant="small" muted>
                {s.principleBook[r.key]}
              </T>
            </View>
          </Row>
        </View>
        <StatusChip status={r.status} testID={`principle.${r.key}.status`} />
      </Row>
      <View style={{ backgroundColor: p.surfaceMuted, borderRadius: Radii.md, padding: Space.md }}>
        <T variant="small" testID={`principle.${r.key}.text`}>
          {text}
        </T>
      </View>
      <Button kind={r.status === 'opportunity' ? 'tonal' : 'text'} label={actLabel} onPress={act} testID={`principle.${r.key}.act`} style={{ alignSelf: 'flex-start' }} />
    </Card>
  );
}
