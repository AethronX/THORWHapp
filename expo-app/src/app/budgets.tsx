import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { spends, totalBudget } from '../state/selectors';
import { useAppState, useController, useUi } from '../ui/AppContext';
import { CategoryBadge, Row, runGuarded, Screen, T, TotalRow } from '../ui/components';
import { categoryLabel } from '../ui/format';
import { AmountEditor } from '../ui/InlineEditor';
import { MIN_TAP, Space } from '../ui/theme';

/** Per-category monthly limits (they repeat every month). */
export default function Budgets() {
  const st = useAppState();
  const c = useController();
  const { s, p, money } = useUi();
  // `focus` + `suggest`: opened from a guidance step to set or change one limit.
  const { focus, suggest } = useLocalSearchParams<{ focus?: string; suggest?: string }>();
  const [editing, setEditing] = useState<number | null>(focus ? Number(focus) : null);
  const suggested = suggest && /^\d+$/.test(suggest) ? Number(suggest) : undefined;
  const spentBy = new Map(spends(st).map((x) => [x.category.id, x.spentMinor]));

  return (
    <Screen testID="budgets">
      <T muted>{s.budgetsScreenHint}</T>
      {st.budgets.size > 0 && <TotalRow label={s.monthlyLimit} value={money(totalBudget(st))} />}
      {st.categories.map((cat) => {
        const limit = st.budgets.get(cat.id);
        if (editing === cat.id) {
          return (
            <AmountEditor
              key={cat.id}
              testID="budget.editor"
              title={categoryLabel(cat, s)}
              initialMinor={limit ?? (focus && Number(focus) === cat.id ? suggested : undefined)}
              allowEmpty
              onCancel={() => setEditing(null)}
              onDelete={limit != null ? () => runGuarded(() => c.setBudget(cat.id, null), s.errGeneric).then((ok) => ok && setEditing(null)) : undefined}
              deleteLabel={s.noLimit}
              onSave={async (minor) => {
                if (await runGuarded(() => c.setBudget(cat.id, minor), s.errGeneric)) setEditing(null);
              }}
            />
          );
        }
        return (
          <Pressable
            key={cat.id}
            testID={`budget.row.${cat.id}`}
            accessibilityRole="button"
            accessibilityLabel={`${categoryLabel(cat, s)}${s.listSep}${limit == null ? s.noLimit : money(limit)}`}
            accessibilityHint={s.edit}
            onPress={() => setEditing(cat.id)}
            style={{ minHeight: MIN_TAP, justifyContent: 'center', paddingVertical: Space.xs, borderBottomWidth: 1, borderBottomColor: p.outline }}
          >
            <Row>
              <CategoryBadge category={cat} size={36} />
              <View style={{ flex: 1 }}>
                <T>{categoryLabel(cat, s)}</T>
                {limit != null && (
                  <T variant="small" muted>
                    {s.budgetUsage(money(spentBy.get(cat.id) ?? 0), money(limit))}
                  </T>
                )}
              </View>
              <T muted={limit == null}>{limit == null ? s.noLimit : money(limit)}</T>
            </Row>
          </Pressable>
        );
      })}
    </Screen>
  );
}
