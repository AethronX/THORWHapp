import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { compareDays, monthsUntil } from '../../core/dates';
import { goalProgress, requiredMonthlySaving } from '../../domain/financeEngine';
import { isGoalReached, SavingsGoal } from '../../domain/models';
import { useAppState, useController, useUi } from '../../ui/AppContext';
import { Button, Card, EmptyState, Fab, Icon, IconButton, LabeledProgress, Row, runGuarded, Screen, T } from '../../ui/components';
import { formatDate, formatPercent } from '../../ui/format';
import { AmountEditor } from '../../ui/InlineEditor';
import { Radii, Space } from '../../ui/theme';

/**
 * "Closest to done" is only said about a goal that really is near the end: the
 * goal-gradient effect is about the finish line being in sight, and the badge
 * on a goal at 0 % would be true but useless.
 */
const NEAR_DONE = 0.5;

export default function Goals() {
  const st = useAppState();
  const { s } = useUi();
  /*
   * Closest to done first (D-052). People push hardest near the finish line
   * (the goal-gradient effect), so the goal with the least left to put in is
   * the one worth seeing first; reached and paused goals sink to the bottom
   * because neither asks anything of the user today.
   */
  const rank = (g: SavingsGoal) => (isGoalReached(g) ? 2 : g.paused ? 1 : 0);
  const left = (g: SavingsGoal) => Math.max(0, g.targetMinor - g.savedMinor);
  const ordered = [...st.goals].sort((a, b) => rank(a) - rank(b) || left(a) - left(b) || a.id - b.id);
  return (
    <View style={{ flex: 1 }}>
      <Screen testID="goals">
        <Row style={{ flexWrap: 'wrap' }} gap={Space.sm}>
          <Button size="sm" kind="tonal" icon="coins" label={s.wealthOpen} onPress={() => router.push('/wealth')} testID="goals.wealth" />
          <Button size="sm" kind="tonal" icon="plan" label={s.openPlan} onPress={() => router.push('/plan')} testID="goals.plan" />
        </Row>
        {st.goals.length === 0 ? (
          <EmptyState icon="goals" title={s.goalsEmpty} body={s.goalsEmptyBody} />
        ) : (
          ordered.map((g, i) => <GoalCard key={g.id} goal={g} nearest={i === 0 && ordered.length > 1 && !isGoalReached(g) && !g.paused && goalProgress(g.savedMinor, g.targetMinor) >= NEAR_DONE} />)
        )}
      </Screen>
      <Fab label={s.addGoal} onPress={() => router.push('/goal/new')} testID="goals.add" />
    </View>
  );
}

function GoalCard({ goal, nearest = false }: { goal: SavingsGoal; nearest?: boolean }) {
  const st = useAppState();
  const c = useController();
  const { s, p, money } = useUi();
  const [mode, setMode] = useState<'add' | 'withdraw' | null>(null);
  const reached = isGoalReached(goal);
  const overdue = !reached && compareDays(goal.targetDate, st.today) < 0;
  const months = monthsUntil(st.today, goal.targetDate);
  const required = requiredMonthlySaving({ targetMinor: goal.targetMinor, savedMinor: goal.savedMinor, months });
  const progress = goalProgress(goal.savedMinor, goal.targetMinor);
  const status = reached ? s.goalReached : overdue ? s.goalOverdue : s.monthsLeft(months);

  return (
    <Card testID={`goal.card.${goal.id}`} title={goal.name} action={<IconButton icon="edit" label={s.edit} onPress={() => router.push(`/goal/${goal.id}`)} testID={`goal.edit.${goal.id}`} />}>
      {nearest && (
        <Row
          testID={`goal.nearest.${goal.id}`}
          style={{ alignSelf: 'flex-start', backgroundColor: p.primaryContainer, borderRadius: Radii.pill, paddingHorizontal: Space.md, paddingVertical: Space.xs }}
        >
          <Icon name="target" size={16} color={p.onPrimaryContainer} />
          <T variant="label" color={p.onPrimaryContainer}>
            {s.goalNearest}
          </T>
        </Row>
      )}
      {reached && (
        <Row style={{ alignSelf: 'flex-start', backgroundColor: p.accentContainer, borderRadius: Radii.pill, paddingHorizontal: Space.md, paddingVertical: Space.xs }}>
          <Icon name="trophy" size={18} color={p.accentText} />
          <T variant="label" color={p.accentText}>
            {s.goalReached}
          </T>
        </Row>
      )}
      {/* The bar says how far you came; the line under it says what is left to put in. */}
      <LabeledProgress value={progress} label={s.goalSaved(money(goal.savedMinor), money(goal.targetMinor))} trailing={formatPercent(progress)} />
      {!reached && (
        <T variant="label" color={p.primary} testID={`goal.remaining.${goal.id}`}>
          {s.goalRemaining(money(goal.targetMinor - goal.savedMinor))}
        </T>
      )}
      <Row>
        <Icon name={reached ? 'success' : overdue ? 'warning' : 'calendar'} size={18} color={reached ? p.positive : overdue ? p.warning : p.onSurfaceMuted} />
        <View style={{ flex: 1 }}>
          <T variant="small" muted>{`${s.goalDue(formatDate(goal.targetDate, st.locale))} · ${status}`}</T>
        </View>
      </Row>
      {goal.paused && (
        <Row testID={`goal.paused.${goal.id}`} style={{ alignItems: 'flex-start' }} gap={Space.xs}>
          <Icon name="info" size={16} color={p.onSurfaceMuted} />
          <View style={{ flex: 1 }}>
            <T variant="small" muted>
              {s.goalPausedNote}
            </T>
          </View>
        </Row>
      )}
      {!reached && !overdue && !goal.paused && (
        <T variant="subtitle" testID={`goal.required.${goal.id}`}>
          {s.goalRequiredMonthly(money(required))}
        </T>
      )}
      {mode ? (
        <AmountEditor
          testID="contribution"
          title={mode === 'add' ? s.addMoney : s.withdraw}
          onCancel={() => setMode(null)}
          validate={(minor) => (mode === 'withdraw' && minor > goal.savedMinor ? s.errWithdrawTooMuch : null)}
          onSave={async (minor) => {
            const amount = mode === 'withdraw' ? -minor! : minor!;
            if (await runGuarded(() => c.addContribution(goal.id, amount), s.errGeneric)) setMode(null);
          }}
        />
      ) : (
        <Row style={{ flexWrap: 'wrap' }} gap={Space.sm}>
          <Button size="sm" kind="tonal" icon="add" label={s.addMoney} onPress={() => setMode('add')} testID={`goal.add.${goal.id}`} />
          {goal.savedMinor > 0 && <Button size="sm" kind="outlined" icon="remove" label={s.withdraw} onPress={() => setMode('withdraw')} testID={`goal.withdraw.${goal.id}`} />}
          {!reached && (
            <Button
              size="sm"
              kind="text"
              label={goal.paused ? s.goalResume : s.goalPause}
              onPress={() => runGuarded(() => c.setGoalPaused(goal.id, !goal.paused), s.errGeneric)}
              testID={`goal.pause.${goal.id}`}
            />
          )}
        </Row>
      )}
    </Card>
  );
}
