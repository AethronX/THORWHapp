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

export default function Goals() {
  const st = useAppState();
  const { s } = useUi();
  return (
    <View style={{ flex: 1 }}>
      <Screen testID="goals">
        <Row style={{ flexWrap: 'wrap' }} gap={Space.sm}>
          <Button kind="tonal" icon="coins" label={s.wealthOpen} onPress={() => router.push('/wealth')} testID="goals.wealth" />
          <Button kind="tonal" icon="plan" label={s.openPlan} onPress={() => router.push('/plan')} testID="goals.plan" />
        </Row>
        {st.goals.length === 0 ? (
          <EmptyState icon="goals" title={s.goalsEmpty} body={s.goalsEmptyBody} />
        ) : (
          st.goals.map((g) => <GoalCard key={g.id} goal={g} />)
        )}
      </Screen>
      <Fab label={s.addGoal} onPress={() => router.push('/goal/new')} testID="goals.add" />
    </View>
  );
}

function GoalCard({ goal }: { goal: SavingsGoal }) {
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
    <Card
      testID={`goal.card.${goal.id}`}
      title={goal.name}
      action={<IconButton icon="edit" label={s.edit} onPress={() => router.push(`/goal/${goal.id}`)} testID={`goal.edit.${goal.id}`} />}
    >
      {reached && (
        <Row style={{ alignSelf: 'flex-start', backgroundColor: p.accentContainer, borderRadius: Radii.pill, paddingHorizontal: Space.md, paddingVertical: Space.xs }}>
          <Icon name="trophy" size={18} color={p.accentText} />
          <T variant="label" color={p.accentText}>
            {s.goalReached}
          </T>
        </Row>
      )}
      <LabeledProgress value={progress} label={s.goalSaved(money(goal.savedMinor), money(goal.targetMinor))} trailing={formatPercent(progress)} />
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
          <Button kind="tonal" icon="add" label={s.addMoney} onPress={() => setMode('add')} testID={`goal.add.${goal.id}`} />
          {goal.savedMinor > 0 && <Button kind="outlined" icon="remove" label={s.withdraw} onPress={() => setMode('withdraw')} testID={`goal.withdraw.${goal.id}`} />}
          {!reached && (
            <Button
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
