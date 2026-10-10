import { useState } from 'react';
import { Alert, View } from 'react-native';

import type { Category } from '../domain/models';
import { useAppState, useController, useUi } from '../ui/AppContext';
import { Button, Card, CategoryBadge, confirm, Field, IconButton, Row, runGuarded, Screen, T } from '../ui/components';
import { categoryLabel } from '../ui/format';
import { Space } from '../ui/theme';

export default function Categories() {
  const st = useAppState();
  const c = useController();
  const { s, p } = useUi();
  const [editing, setEditing] = useState<Category | 'new' | null>(null);

  async function remove(cat: Category) {
    const yes = await confirm({ title: s.deleteCategoryConfirm, confirmLabel: s.delete, cancelLabel: s.cancel, destructive: true });
    if (!yes) return;
    try {
      const archived = await c.removeCategory(cat.id);
      if (archived) Alert.alert(s.categoryArchivedNote);
    } catch {
      Alert.alert(s.errGeneric);
    }
  }

  return (
    <Screen testID="categories">
      {editing ? (
        <NameEditor
          key={editing === 'new' ? 'new' : editing.id}
          title={editing === 'new' ? s.addCategory : s.rename}
          // Pre-fill only custom names: saving a localised built-in label would
          // freeze it in the current language.
          initial={editing === 'new' ? '' : (editing.name ?? '')}
          onCancel={() => setEditing(null)}
          onSave={async (name) => {
            const ok = await runGuarded(() => (editing === 'new' ? c.addCategory(name) : c.renameCategory(editing.id, name)), s.errGeneric);
            if (ok) setEditing(null);
          }}
        />
      ) : (
        <Button icon="add" label={s.addCategory} onPress={() => setEditing('new')} testID="categories.add" />
      )}
      {st.categories.map((cat) => (
        <Row key={cat.id} style={{ borderBottomWidth: 1, borderBottomColor: p.outline }}>
          <CategoryBadge category={cat} size={36} />
          <View style={{ flex: 1 }}>
            <T>{categoryLabel(cat, s)}</T>
          </View>
          <IconButton icon="edit" label={`${s.rename}: ${categoryLabel(cat, s)}`} onPress={() => setEditing(cat)} testID={`category.rename.${cat.id}`} />
          <IconButton icon="delete" label={`${s.delete}: ${categoryLabel(cat, s)}`} onPress={() => remove(cat)} testID={`category.delete.${cat.id}`} />
        </Row>
      ))}
      <View style={{ height: Space.lg }} />
    </Screen>
  );
}

function NameEditor({ title, initial, onSave, onCancel }: { title: string; initial: string; onSave: (name: string) => Promise<void>; onCancel: () => void }) {
  const { s } = useUi();
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const error = submitted && name.trim() === '' ? s.errNameEmpty : null;
  return (
    <Card title={title}>
      <Field testID="category.name" label={s.categoryName} value={name} onChangeText={setName} maxLength={30} autoFocus error={error} />
      <Row>
        <Button
          label={s.save}
          testID="category.save"
          disabled={busy}
          onPress={async () => {
            setSubmitted(true);
            if (name.trim() === '' || busy) return;
            setBusy(true);
            await onSave(name);
            setBusy(false);
          }}
        />
        <Button kind="text" label={s.cancel} onPress={onCancel} />
      </Row>
    </Card>
  );
}
