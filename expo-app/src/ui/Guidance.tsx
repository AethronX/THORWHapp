import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { minorToEditable } from '../core/amountParser';
import { dayKey } from '../core/dates';
import type { Guidance } from '../domain/guidance';
import { useAppState, useController, useUi } from './AppContext';
import { Button, Card, Icon, Row, runGuarded, T } from './components';
import { haptic } from './feedback';
import type { Locale } from '../state/appController';
import { categoryLabel, formatDate, formatPercent } from './format';
import type { Strings } from './i18n';
import { Radii, Space } from './theme';

interface Text {
  title: string;
  why: string;
  action: string;
}

/** Words for one guidance item: what, why (with the user's own numbers), and the action label. */
export function guidanceText(g: Guidance, s: Strings, money: (m: number) => string, catName: (id: number) => string, locale: Locale = 'ar'): Text {
  const a = g.action;
  switch (g.kind) {
    case 'addIncome':
      return { title: s.gAddIncomeTitle, why: s.gAddIncomeWhy, action: s.gAddIncomeAction };
    case 'overspending':
      return { title: s.gOverspendingTitle(money(g.amountMinor)), why: s.gOverspendingWhy, action: s.gReviewBudgets };
    case 'overBudget':
      return { title: s.gOverBudgetTitle(catName(g.categoryId), money(g.spentMinor - g.limitMinor)), why: s.gOverBudgetWhy(money(g.spentMinor), money(g.limitMinor)), action: s.gEditLimit };
    case 'goalAtRisk':
      return { title: s.gGoalAtRiskTitle(g.goal.name, money(g.requiredMinor)), why: s.gGoalAtRiskWhy(money(g.netMinor)), action: s.gOpenGoals };
    case 'categoryRising': {
      const limit = a.type === 'setBudget' ? money(a.suggestedLimitMinor) : '';
      return {
        title: s.gRisingTitle(catName(g.categoryId), formatPercent(g.pct)),
        why: s.gRisingWhy(g.throughDay, money(g.currentMinor), money(g.previousMinor), limit),
        action: s.gSetLimit(limit),
      };
    }
    case 'emergencyFund':
      return {
        title: s.gEmergencyTitle(money(g.target3Minor)),
        why: s.gEmergencyWhy(money(g.monthlyEssentialMinor), g.monthsOfData, money(g.target3Minor), money(g.target6Minor), money(g.savedMinor)),
        action: a.type === 'createGoal' ? s.gCreateGoal : s.gOpenGoals,
      };
    case 'saveSurplus':
      return { title: s.gSurplusTitle(money(g.netMinor)), why: s.gSurplusWhy(g.goal.name), action: s.gAddToGoal };
    case 'payYourselfFirst':
      return { title: s.gPayFirstTitle(money(g.amountMinor), g.goal.name), why: s.gPayFirstWhy(g.daysSincePayday, money(g.amountMinor)), action: s.gAddToGoal };
    case 'season':
      return {
        title: s.gSeasonTitle(s.seasonName[g.season], g.daysAway),
        why: s.gSeasonWhy(s.seasonName[g.season], formatDate(g.date, locale), g.months),
        action: s.gCreateGoal,
      };
  }
}

/**
 * "Your next step": the top guidance item with its reason, one real action
 * and "Not now". Further items fold out below. Renders nothing when there is
 * no step to suggest.
 */
export function NextStepCard({ items }: { items: Guidance[] }) {
  const st = useAppState();
  const c = useController();
  const { s, p, money } = useUi();
  const [showAll, setShowAll] = useState(false);
  if (items.length === 0) return null;
  const catName = (id: number) => {
    const cat = st.categoriesById.get(id);
    return cat ? categoryLabel(cat, s) : s.otherSlice;
  };

  const act = (g: Guidance) => {
    haptic.tap();
    const a = g.action;
    switch (a.type) {
      case 'addIncome':
        return router.push('/income');
      case 'reviewBudgets':
        return router.push('/budgets');
      case 'setBudget':
        return router.push({ pathname: '/budgets', params: { focus: String(a.categoryId), suggest: String(a.suggestedLimitMinor) } });
      case 'createGoal':
        return router.push({ pathname: '/goal/[id]', params: { id: 'new', name: s.emergencyGoalName, target: minorToEditable(a.targetMinor, st.currency) } });
      case 'createSeasonGoal':
        return router.push({ pathname: '/goal/[id]', params: { id: 'new', name: s.seasonGoalName(a.season, a.year), date: dayKey(a.targetDate) } });
      case 'openGoals':
        return router.push('/goals');
    }
  };
  const dismiss = (g: Guidance) => {
    haptic.tick();
    runGuarded(() => c.dismissGuidance(g.id), s.errGeneric);
  };

  const [top, ...rest] = items;
  return (
    <Card testID="nextStep" style={{ borderColor: p.primary, borderWidth: 1 }}>
      <Row gap={Space.xs}>
        <Icon name="flag" size={18} color={p.primary} />
        <T variant="label" color={p.primary}>
          {s.nextStepTitle}
        </T>
      </Row>
      <Step g={top} text={guidanceText(top, s, money, catName, st.locale)} onAct={() => act(top)} onDismiss={() => dismiss(top)} prominent />
      {rest.length > 0 && (
        <Pressable testID="nextStep.more" accessibilityRole="button" accessibilityState={{ expanded: showAll }} onPress={() => setShowAll(!showAll)} hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}>
          <T variant="label" color={p.primary}>
            {showAll ? s.showLess : s.moreSteps(rest.length)}
          </T>
        </Pressable>
      )}
      {showAll &&
        rest.map((g) => (
          <View key={g.id} style={{ borderTopWidth: 1, borderTopColor: p.outline, paddingTop: Space.md }}>
            <Step g={g} text={guidanceText(g, s, money, catName, st.locale)} onAct={() => act(g)} onDismiss={() => dismiss(g)} />
          </View>
        ))}
    </Card>
  );
}

function Step({ g, text, onAct, onDismiss, prominent = false }: { g: Guidance; text: Text; onAct: () => void; onDismiss: () => void; prominent?: boolean }) {
  const { s, p } = useUi();
  const [why, setWhy] = useState(false);
  return (
    <View style={{ gap: Space.sm }} testID={`guidance.${g.id}`}>
      <T variant={prominent ? 'subtitle' : 'body'} testID={`guidance.${g.id}.title`}>
        {text.title}
      </T>
      <Pressable testID={`guidance.${g.id}.why`} accessibilityRole="button" accessibilityState={{ expanded: why }} onPress={() => setWhy(!why)} hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}>
        <Row gap={Space.xs}>
          <Icon name="info" size={16} color={p.primary} />
          <T variant="small" color={p.primary}>
            {s.whyThis}
          </T>
        </Row>
      </Pressable>
      {why && (
        <View style={{ backgroundColor: p.surfaceMuted, borderRadius: Radii.md, padding: Space.md, gap: Space.xs }}>
          <T variant="small" testID={`guidance.${g.id}.reason`}>
            {text.why}
          </T>
          <T variant="small" muted>
            {s.guidanceBasis}
          </T>
        </View>
      )}
      <Row style={{ flexWrap: 'wrap' }}>
        <Button kind={prominent ? 'filled' : 'tonal'} label={text.action} onPress={onAct} testID={`guidance.${g.id}.act`} />
        <Button kind="text" label={s.notNow} onPress={onDismiss} testID={`guidance.${g.id}.dismiss`} />
      </Row>
    </View>
  );
}
