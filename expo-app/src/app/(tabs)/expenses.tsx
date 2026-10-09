import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { expenseTotal } from '../../state/selectors';
import { useAppState, useUi } from '../../ui/AppContext';
import { CategoryBadge, EmptyState, Fab, MonthSwitcher, Row, Screen, T, TotalRow } from '../../ui/components';
import { categoryLabel, formatDate } from '../../ui/format';
import { MIN_TAP, Space } from '../../ui/theme';

export default function Expenses() {
  const st = useAppState();
  const { s, p, money } = useUi();
  return (
    <View style={{ flex: 1 }}>
      <Screen testID="expenses">
        <MonthSwitcher />
        <TotalRow label={s.expenses} value={money(expenseTotal(st))} testID="expenses.total" />
        {st.expenses.length === 0 ? (
          <EmptyState icon="expenses" title={s.noExpenses} body={s.noExpensesBody} />
        ) : (
          st.expenses.map((e) => {
            const cat = st.categoriesById.get(e.categoryId);
            const name = cat ? categoryLabel(cat, s) : '';
            const sub = [formatDate(e.date, st.locale), e.note].filter(Boolean).join(' · ');
            return (
              <Pressable
                key={e.id}
                testID={`expense.row.${e.id}`}
                accessibilityRole="button"
                accessibilityLabel={`${name}، ${money(e.amountMinor)}، ${sub}`}
                accessibilityHint={s.edit}
                onPress={() => router.push(`/expense/${e.id}`)}
                style={{ minHeight: MIN_TAP, borderBottomWidth: 1, borderBottomColor: p.outline, paddingVertical: Space.sm }}
              >
                <Row>
                  <CategoryBadge category={cat} />
                  <View style={{ flex: 1 }}>
                    <T>{name}</T>
                    <T variant="small" muted>
                      {sub}
                    </T>
                  </View>
                  <T variant="amount" color={p.expense}>
                    {money(e.amountMinor)}
                  </T>
                </Row>
              </Pressable>
            );
          })
        )}
      </Screen>
      <Fab label={s.addExpense} onPress={() => router.push('/quick-add')} testID="expenses.add" />
    </View>
  );
}
