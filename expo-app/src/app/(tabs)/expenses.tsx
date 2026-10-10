import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { filterExpenses, isFiltering } from '../../domain/search';
import { expenseTotal } from '../../state/selectors';
import { useAppState, useUi } from '../../ui/AppContext';
import { Button, CategoryBadge, EmptyState, Fab, Icon, MonthSwitcher, Row, Screen, T, TotalRow } from '../../ui/components';
import { categoryIcon, categoryLabel, formatDate, formatMonth } from '../../ui/format';
import { categoryTone, Fonts, MIN_TAP, Radii, Space } from '../../ui/theme';

/** Expenses of the viewed month, with search (note + category) and a category filter. */
export default function Expenses() {
  const st = useAppState();
  const { s, p, money, rtl, say } = useUi();
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);

  const nameOf = (id: number) => {
    const c = st.categoriesById.get(id);
    return c ? categoryLabel(c, s) : '';
  };
  const filter = { query, categoryId };
  const filtering = isFiltering(filter);
  const shown = filterExpenses(st.expenses, filter, nameOf);
  const shownTotal = shown.reduce((t, e) => t + e.amountMinor, 0);
  // Chips: only categories that have expenses this month, biggest first.
  const used = [...st.expenses.reduce((m, e) => m.set(e.categoryId, (m.get(e.categoryId) ?? 0) + e.amountMinor), new Map<number, number>())]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => st.categoriesById.get(id))
    .filter((c): c is NonNullable<typeof c> => !!c);
  const clear = () => {
    setQuery('');
    setCategoryId(null);
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen testID="expenses">
        <MonthSwitcher />
        {st.expenses.length > 0 && (
          <View style={{ gap: Space.sm }}>
            <Row
              gap={Space.xs}
              style={{ minHeight: MIN_TAP, borderRadius: Radii.md, borderWidth: 1, borderColor: p.borderStrong, backgroundColor: p.surface, paddingHorizontal: Space.md }}
            >
              <Icon name="search" size={20} color={p.onSurfaceMuted} />
              <TextInput
                testID="expenses.search"
                value={query}
                onChangeText={setQuery}
                placeholder={s.searchPlaceholder}
                placeholderTextColor={p.textSubtle}
                accessibilityLabel={s.searchPlaceholder}
                accessibilityHint={s.searchScope(formatMonth(st.month, st.locale))}
                returnKeyType="search"
                style={{ flex: 1, minHeight: MIN_TAP, fontFamily: Fonts.regular, fontSize: 16, color: p.onSurface, textAlign: rtl ? 'right' : 'left' }}
                maxFontSizeMultiplier={2}
              />
              {query !== '' && (
                <Pressable testID="expenses.search.clear" accessibilityRole="button" accessibilityLabel={s.clearSearch} onPress={() => setQuery('')} hitSlop={14}>
                  <Icon name="clear" size={20} color={p.onSurfaceMuted} />
                </Pressable>
              )}
            </Row>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Space.xs }} accessibilityRole="radiogroup">
              {[null, ...used].map((c) => {
                const selected = (c?.id ?? null) === categoryId;
                const label = c ? categoryLabel(c, s) : s.filterAll;
                return (
                  <Pressable
                    key={c?.id ?? 'all'}
                    testID={`expenses.filter.${c?.id ?? 'all'}`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={label}
                    onPress={() => setCategoryId(c?.id ?? null)}
                    hitSlop={{ top: 4, bottom: 4 }}
                    style={{ minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: Space.xs, paddingHorizontal: Space.md, borderRadius: Radii.pill, borderWidth: 1, borderColor: selected ? p.primary : p.outline, backgroundColor: selected ? p.primaryContainer : p.surface }}
                  >
                    {c && <Icon name={categoryIcon(c)} size={16} color={selected ? p.onPrimaryContainer : categoryTone(p, c.key, c.iconCode).fg} />}
                    <T variant="label" color={selected ? p.onPrimaryContainer : p.onSurface}>
                      {label}
                    </T>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}
        {filtering ? (
          <T variant="small" muted testID="expenses.results">
            {s.resultsSummary(shown.length, st.expenses.length, money(shownTotal))}
          </T>
        ) : (
          <TotalRow label={s.expenses} value={money(expenseTotal(st))} testID="expenses.total" />
        )}
        {st.expenses.length === 0 ? (
          <EmptyState icon="expenses" title={s.noExpenses} body={s.noExpensesBody} />
        ) : shown.length === 0 ? (
          <EmptyState icon="search" title={s.noResults} body={s.noResultsBody} action={<Button kind="outlined" label={s.clearFilters} onPress={clear} testID="expenses.clearFilters" />} />
        ) : (
          shown.map((e) => {
            const cat = st.categoriesById.get(e.categoryId);
            const name = cat ? categoryLabel(cat, s) : '';
            const sub = [formatDate(e.date, st.locale), e.note].filter(Boolean).join(' · ');
            return (
              <Pressable
                key={e.id}
                testID={`expense.row.${e.id}`}
                accessibilityRole="button"
                accessibilityLabel={say(`${name}${s.listSep}${money(e.amountMinor)}${s.listSep}${sub}`)}
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
