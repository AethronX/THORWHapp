import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Keyboard, ScrollView, TextInput, View } from 'react-native';

import { parseAmount } from '../core/amountParser';
import { Day, dayFromDate, dayToDate } from '../core/dates';
import { keypadInput, KeypadKey } from '../core/keypad';
import { suggestCategory } from '../domain/smart';
import { parseTextEntry } from '../domain/textEntry';
import { minorToEditable } from '../core/amountParser';
import { useAppState, useController, useUi } from '../ui/AppContext';
import { Button, Icon, Row, runGuarded, T } from '../ui/components';
import { haptic } from '../ui/feedback';
import { showToast } from '../ui/toast';
import { PhIcon } from '../ui/icons';
import { categoryIcon, categoryLabel, currencySymbol } from '../ui/format';
import { PressScale } from '../ui/motion';
import { categoryTone, Fonts, MIN_TAP, Radii, Space } from '../ui/theme';

const LRM = '‎';
const group = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/**
 * Quick add: amount first on a big in-app keypad, then one tap on a category.
 * The category is pre-selected from the note — first from the user's own
 * history, then from common words and Omani merchants (src/domain/smart.ts).
 * Three taps for a typical expense: digits → (suggested) category → save.
 */
export default function QuickAdd() {
  const st = useAppState();
  const c = useController();
  const { s, p, money, rtl } = useUi();
  // `cat`: opened from a home shortcut with the category already chosen.
  const { cat } = useLocalSearchParams<{ cat?: string }>();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [picked, setPicked] = useState<number | null>(cat && /^\d+$/.test(cat) ? Number(cat) : null);
  const [yesterday, setYesterday] = useState(false);
  const [busy, setBusy] = useState(false);

  // Free text ("قهوة 1.5", "قهوة 500 بيسة", dictated or typed) → amount + clean note, when the keypad is empty.
  const fromText = useMemo(() => parseTextEntry(note, st.currency), [note, st.currency]);
  const usingText = amount === '' && fromText.amountMinor != null;
  const cleanNote = usingText ? fromText.note : note.trim();
  const suggestion = useMemo(() => suggestCategory(cleanNote, st.history, st.categories), [cleanNote, st.history, st.categories]);
  const categoryId = picked ?? suggestion?.categoryId ?? null;

  // Suggested first, then the categories this user uses most, then the rest.
  const ordered = useMemo(() => {
    const uses = new Map<number, number>();
    for (const e of st.history) uses.set(e.categoryId, (uses.get(e.categoryId) ?? 0) + 1);
    return [...st.categories].sort(
      (a, b) =>
        Number(b.id === suggestion?.categoryId) - Number(a.id === suggestion?.categoryId) ||
        (uses.get(b.id) ?? 0) - (uses.get(a.id) ?? 0) ||
        a.id - b.id,
    );
  }, [st.categories, st.history, suggestion?.categoryId]);

  const parsed = amount === '' ? null : parseAmount(amount, st.currency);
  const amountMinor = usingText ? fromText.amountMinor! : parsed?.ok ? parsed.minor : 0;
  const canSave = amountMinor > 0 && categoryId != null && !busy;
  const date: Day = yesterday ? dayFromDate(new Date(dayToDate(st.today).getTime() - 86400000)) : st.today;

  const [whole, frac] = ((usingText ? minorToEditable(amountMinor, st.currency) : amount) || '0').split('.');
  const typed = group(whole) + (frac !== undefined ? `.${frac}` : '');
  const symbol = currencySymbol(st.currency, st.locale);
  const display = st.locale === 'ar' ? `${LRM}${typed}${LRM}\u00A0${symbol}` : `${symbol}\u00A0${typed}`;

  const press = (k: KeypadKey) => {
    Keyboard.dismiss();
    haptic.tick();
    setAmount((a) => keypadInput(a, k, st.currency.exponent));
  };

  async function save() {
    if (!canSave || categoryId == null) return;
    setBusy(true);
    let newId: number | null = null;
    const ok = await runGuarded(async () => {
      newId = await c.addExpense({ amountMinor, categoryId, date, note: cleanNote });
    }, s.errGeneric);
    setBusy(false);
    if (ok) {
      // Warning pattern if this expense takes the category over its budget.
      const limit = st.budgets.get(categoryId);
      const before = st.expenses.filter((e) => e.categoryId === categoryId).reduce((t, e) => t + e.amountMinor, 0);
      if (limit != null && before <= limit && before + amountMinor > limit) haptic.warning();
      else haptic.success();
      router.back();
      const cat = st.categoriesById.get(categoryId);
      const id = newId;
      showToast({
        message: s.toastExpenseAdded(money(amountMinor), cat ? categoryLabel(cat, s) : ''),
        actionLabel: s.undo,
        onAction: id == null ? undefined : () => runGuarded(() => c.deleteExpense(id), s.errGeneric),
      });
    }
  }

  function moreDetails() {
    router.replace({ pathname: '/expense/[id]', params: { id: 'new', amount, note, cat: categoryId != null ? String(categoryId) : '' } });
  }

  return (
    <View testID="quickAdd" style={{ flex: 1, backgroundColor: p.background, paddingHorizontal: Space.gutter, paddingBottom: Space.lg, gap: Space.md }}>
      {/* Amount */}
      <View style={{ alignItems: 'center', paddingTop: Space.lg, gap: Space.sm }}>
        <View accessible accessibilityLiveRegion="polite" accessibilityLabel={`${s.amount}: ${amount === '' ? money(0) : display}`}>
          <T testID="quick.amount" variant="display" center color={amount === '' && !usingText ? p.textSubtle : p.onSurface} style={{ fontSize: 44, lineHeight: 60 }}>
            {display}
          </T>
        </View>
        {usingText && (
          <T variant="small" color={p.accentText} testID="quick.fromText">
            {s.amountFromText}
          </T>
        )}
        <Row gap={Space.xs}>
          {[false, true].map((y) => (
            <PressScale
              key={String(y)}
              testID={y ? 'quick.yesterday' : 'quick.today'}
              accessibilityRole="radio"
              accessibilityState={{ selected: yesterday === y }}
              onPress={() => {
                haptic.tick();
                setYesterday(y);
              }}
              hitSlop={{ top: 6, bottom: 6 }}
              style={{ paddingHorizontal: Space.md, minHeight: 36, justifyContent: 'center', borderRadius: Radii.pill, backgroundColor: yesterday === y ? p.primaryContainer : 'transparent', borderWidth: 1, borderColor: yesterday === y ? p.primary : p.outline }}
            >
              <T variant="label" color={yesterday === y ? p.onPrimaryContainer : p.onSurfaceMuted}>
                {y ? s.yesterday : s.today}
              </T>
            </PressScale>
          ))}
        </Row>
      </View>

      {/* Note → smart category */}
      <View style={{ gap: Space.xs }}>
        <TextInput
          testID="quick.note"
          value={note}
          onChangeText={setNote}
          placeholder={s.quickNoteHint}
          placeholderTextColor={p.textSubtle}
          maxLength={120}
          accessibilityLabel={s.note}
          style={{ minHeight: MIN_TAP, borderRadius: Radii.md, borderWidth: 1, borderColor: p.borderStrong, backgroundColor: p.surface, paddingHorizontal: Space.md, fontFamily: Fonts.regular, fontSize: 16, color: p.onSurface, textAlign: rtl ? 'right' : 'left', writingDirection: 'auto' }}
          maxFontSizeMultiplier={2}
        />
        {suggestion && picked == null && (
          <Row gap={Space.xs} testID="quick.suggestion">
            <Icon name="sparkle" size={16} color={p.accentText} />
            <T variant="small" color={p.accentText}>
              {suggestion.source === 'history' ? s.suggestedHistory : s.suggestedKeyword}
            </T>
          </Row>
        )}
      </View>

      {/* Categories */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: Space.sm, paddingVertical: Space.xxs }} accessibilityRole="radiogroup">
        {ordered.map((cat) => {
          const selected = cat.id === categoryId;
          const tone = categoryTone(p, cat.key, cat.iconCode);
          return (
            <PressScale
              key={cat.id}
              testID={`quick.cat.${cat.id}`}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={categoryLabel(cat, s)}
              onPress={() => {
                haptic.tick();
                setPicked(cat.id);
              }}
              style={{ minHeight: MIN_TAP, flexDirection: 'row', alignItems: 'center', gap: Space.xs, paddingHorizontal: Space.md, borderRadius: Radii.pill, borderWidth: 1.5, borderColor: selected ? p.primary : p.outline, backgroundColor: selected ? p.primaryContainer : p.surface }}
            >
              <Icon name={categoryIcon(cat)} size={18} color={selected ? p.onPrimaryContainer : tone.fg} />
              <T color={selected ? p.onPrimaryContainer : p.onSurface}>{categoryLabel(cat, s)}</T>
            </PressScale>
          );
        })}
      </ScrollView>

      {/* Keypad — digits keep phone order (1 2 3) in both languages. */}
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <View style={{ direction: 'ltr', gap: Space.sm }}>
          {[
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
            [st.currency.exponent > 0 ? '.' : '', '0', 'back'],
          ].map((row, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: Space.sm }}>
              {row.map((k, j) =>
                k === '' ? (
                  <View key={j} style={{ flex: 1 }} />
                ) : (
                  <PressScale
                    key={k}
                    testID={`key.${k === '.' ? 'dec' : k}`}
                    accessibilityRole="button"
                    accessibilityLabel={k === 'back' ? s.keyBack : k === '.' ? s.keyDecimal : k}
                    onPress={() => press(k as KeypadKey)}
                    onLongPress={k === 'back' ? () => setAmount('') : undefined}
                    outerStyle={{ flex: 1 }}
                    style={{ height: 54, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: p.surface, borderWidth: 1, borderColor: p.outline }}
                    scaleTo={0.94}
                  >
                    {k === 'back' ? <PhIcon name="backspace" size={26} color={p.onSurface} rtl={false} /> : <T variant="title">{k}</T>}
                  </PressScale>
                ),
              )}
            </View>
          ))}
        </View>
      </View>

      <Row gap={Space.sm}>
        <Button kind="text" label={s.moreDetails} onPress={moreDetails} testID="quick.more" />
        <Button label={s.save} icon="check" onPress={save} disabled={!canSave} testID="quick.save" style={{ flex: 1 }} />
      </Row>
    </View>
  );
}
