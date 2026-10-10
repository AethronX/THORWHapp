import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';

import { minorToEditable, parseAmount } from '../../core/amountParser';
import { ASSET_KINDS, AssetKind } from '../../domain/models';
import { useAppState, useController, useUi } from '../../ui/AppContext';
import { Button, confirm, Field, Row, runGuarded, Screen, T } from '../../ui/components';
import { amountErrorText, currencySymbol } from '../../ui/format';
import { Radii, Space } from '../../ui/theme';

/** Add (`/asset/new`) or edit (`/asset/<id>`) something the user owns, valued manually. */
export default function AssetForm() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const st = useAppState();
  const c = useController();
  const { s, p } = useUi();
  const existing = id === 'new' ? undefined : st.assets.find((a) => String(a.id) === id);

  const [name, setName] = useState(existing?.name ?? '');
  const [kind, setKind] = useState<AssetKind>(existing?.kind ?? 'bank');
  const [value, setValue] = useState(existing ? minorToEditable(existing.valueMinor, st.currency) : '');
  const [estimate, setEstimate] = useState(existing?.isEstimate ?? false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const parsed = parseAmount(value, st.currency, { allowZero: true });

  async function save() {
    setSubmitted(true);
    if (name.trim() === '' || !parsed.ok) return;
    setBusy(true);
    const data = { name, kind, valueMinor: parsed.minor, isEstimate: estimate };
    const ok = await runGuarded(() => (existing ? c.updateAsset({ ...data, id: existing.id }) : c.addAsset(data)), s.errGeneric);
    setBusy(false);
    if (ok) router.back();
  }

  async function remove() {
    if (!existing) return;
    const yes = await confirm({ title: s.deleteAssetConfirm, confirmLabel: s.delete, cancelLabel: s.cancel, destructive: true });
    if (yes && (await runGuarded(() => c.deleteAsset(existing.id), s.errGeneric))) router.back();
  }

  return (
    <>
      <Stack.Screen options={{ title: existing ? s.editAsset : s.addAsset }} />
      <Screen testID="assetForm">
        <Field testID="asset.name" label={s.assetName} value={name} onChangeText={setName} maxLength={40} error={submitted && name.trim() === '' ? s.errNameEmpty : null} />
        <View style={{ gap: Space.sm }}>
          <T variant="label">{s.assetType}</T>
          <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Space.xs }}>
            {ASSET_KINDS.map((k) => {
              const selected = k === kind;
              return (
                <Pressable
                  key={k}
                  testID={`asset.kind.${k}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setKind(k)}
                  style={{ minHeight: 40, justifyContent: 'center', paddingHorizontal: Space.md, borderRadius: Radii.pill, borderWidth: 1, borderColor: selected ? p.primary : p.outline, backgroundColor: selected ? p.primaryContainer : p.surface }}
                >
                  <T variant="label" color={selected ? p.onPrimaryContainer : p.onSurface}>
                    {s.assetKind[k]}
                  </T>
                </Pressable>
              );
            })}
          </View>
        </View>
        <Field
          testID="asset.value"
          label={s.assetValue}
          keyboardType="decimal-pad"
          value={value}
          onChangeText={setValue}
          suffix={currencySymbol(st.currency, st.locale)}
          error={submitted && !parsed.ok ? amountErrorText(parsed.error, st.currency, s) : null}
          ltr
        />
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <T>{s.assetIsEstimate}</T>
          </View>
          <Switch testID="asset.estimate" value={estimate} onValueChange={setEstimate} trackColor={{ true: p.primary, false: p.outline }} accessibilityLabel={s.assetIsEstimate} />
        </Row>
        <Button label={s.save} onPress={save} disabled={busy} testID="asset.save" />
        {existing && <Button kind="danger" icon="delete" label={s.delete} onPress={remove} disabled={busy} testID="asset.delete" />}
      </Screen>
    </>
  );
}
