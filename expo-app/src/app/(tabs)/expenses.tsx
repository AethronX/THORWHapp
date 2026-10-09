import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { expenseTotal } from '../../state/selectors';
import { useAppState, useUi } from '../../ui/AppContext';
import { EmptyState, Fab, Icon, MonthSwitcher, Row, Screen, T, TotalRow } from '../../ui/components';
import { categoryIcon, categoryLabel, formatDate } from '../../ui/format';
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
          <EmptyState icon="receipt" title={s.noExpenses} body={s.noExpensesBody} />
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
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: p.primaryContainer, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={cat ? categoryIcon(cat) : 'shape-outline'} color={p.onPrimaryContainer} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <T>{name}</T>
                    <T variant="small" muted>
                      {sub}
                    </T>
                  </View>
                  <T variant="subtitle">{money(e.amountMinor)}</T>
                </Row>
              </Pressable>
            );
          })
        )}
      </Screen>
      <Fab label={s.addExpense} onPress={() => router.push('/expense/new')} testID="expenses.add" />
    </View>
  );
}
