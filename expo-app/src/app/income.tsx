import { Pressable, View } from 'react-native';
import { useState } from 'react';

import { incomeTotal } from '../state/selectors';
import { useAppState, useController, useUi } from '../ui/AppContext';
import { Button, confirm, EmptyState, Icon, MonthSwitcher, Row, runGuarded, Screen, T, TotalRow } from '../ui/components';
import { AmountEditor } from '../ui/InlineEditor';
import { MIN_TAP, Space } from '../ui/theme';

/** Income lines of the viewed month. */
export default function Income() {
  const st = useAppState();
  const c = useController();
  const { s, p, money } = useUi();
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const current = typeof editing === 'number' ? st.incomes.find((i) => i.id === editing) : undefined;

  async function remove(id: number) {
    const yes = await confirm({ title: s.deleteIncomeConfirm, confirmLabel: s.delete, cancelLabel: s.cancel, destructive: true });
    if (yes && (await runGuarded(() => c.deleteIncome(id), s.errGeneric))) setEditing(null);
  }

  return (
    <Screen testID="income">
      <MonthSwitcher />
      <TotalRow label={s.incomeTotal} value={money(incomeTotal(st))} testID="income.total" />
      {editing != null ? (
        <AmountEditor
          key={String(editing)}
          testID="income.editor"
          title={editing === 'new' ? s.addIncome : s.editIncome}
          initialMinor={current?.amountMinor}
          textLabel={s.incomeLabel}
          textHint={s.incomeLabelHint}
          initialText={current?.label ?? (st.incomes.length === 0 ? s.salaryLabel : '')}
          onCancel={() => setEditing(null)}
          onDelete={current ? () => remove(current.id) : undefined}
          onSave={async (minor, label) => {
            const ok = await runGuarded(
              () => (current ? c.updateIncome({ ...current, amountMinor: minor!, label }) : c.addIncome(minor!, label)),
              s.errGeneric,
            );
            if (ok) setEditing(null);
          }}
        />
      ) : (
        <Button label={s.addIncome} icon="add" onPress={() => setEditing('new')} testID="income.add" />
      )}
      {st.incomes.length === 0 ? (
        <EmptyState
          icon="wallet"
          title={s.noIncomeYet}
          action={
            st.previousMonthHasIncome ? (
              <Button kind="tonal" label={s.copyLastMonthIncome} onPress={() => runGuarded(c.copyIncomeFromPreviousMonth, s.errGeneric)} testID="income.copy" />
            ) : undefined
          }
        />
      ) : (
        st.incomes.map((i) => (
          <Pressable
            key={i.id}
            testID={`income.row.${i.id}`}
            accessibilityRole="button"
            accessibilityLabel={`${i.label || s.income}، ${money(i.amountMinor)}`}
            accessibilityHint={s.edit}
            onPress={() => setEditing(i.id)}
            style={{ minHeight: MIN_TAP, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: p.outline }}
          >
            <Row>
              <Icon name="wallet" color={p.onSurfaceMuted} />
              <View style={{ flex: 1 }}>
                <T>{i.label || s.income}</T>
              </View>
              <T variant="amount" color={p.income}>
                {money(i.amountMinor)}
              </T>
            </Row>
          </Pressable>
        ))
      )}
      <View style={{ height: Space.lg }} />
    </Screen>
  );
}
