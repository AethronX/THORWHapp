import { router } from 'expo-router';
import { View } from 'react-native';

import { MIN_EXPENSES, Trait } from '../domain/persona';
import { persona } from '../state/selectors';
import { useAppState, useUi } from '../ui/AppContext';
import { Button, Card, EmptyState, HeroPanel, Icon, LabeledProgress, Row, Screen, T } from '../ui/components';
import { haptic } from '../ui/feedback';
import { categoryLabel, formatPercent } from '../ui/format';
import { Radii, Space } from '../ui/theme';

/**
 * "Your money personality" (D-045): the pattern in the user's own everyday
 * spending — when it happens and on what — with one action that fits it.
 * Nothing here compares the user to anyone else: we have no such data.
 */
export default function Persona() {
  const st = useAppState();
  const { s, p, money } = useUi();
  const r = persona(st);
  const ACTIONS: Record<string, { label: string; to: '/goals' | '/budgets' }> = {
    paydaySprinter: { label: s.pActGoals, to: '/goals' },
    weekender: { label: s.pActLimit, to: '/budgets' },
    focused: { label: s.pActLimit, to: '/budgets' },
    steady: { label: s.pActGoals, to: '/goals' },
  };
  const act = r.status === 'ready' ? ACTIONS[r.key] : ACTIONS.steady;

  if (r.status === 'needsData')
    return (
      <Screen testID="persona">
        <EmptyState
          icon="sparkle"
          title={s.personaTitle}
          body={s.personaNeedsData(r.expenses, MIN_EXPENSES)}
          testID="persona.empty"
          action={<Button label={s.quickAdd} icon="add" onPress={() => router.push('/quick-add')} testID="persona.add" />}
        />
      </Screen>
    );

  return (
    <Screen testID="persona">
      <HeroPanel>
        <Row gap={Space.xs}>
          <Icon name="sparkle" size={20} color={p.heroAccent} />
          <T variant="label" color={p.heroAccent}>
            {s.personaTitle}
          </T>
        </Row>
        <T variant="title" color={p.onHero} testID="persona.name">
          {s.personaName[r.key]}
        </T>
        <T variant="small" color={p.onHeroMuted} testID="persona.line">
          {s.personaLine[r.key]}
        </T>
      </HeroPanel>

      <Card testID="persona.tip">
        <Row gap={Space.sm} style={{ alignItems: 'flex-start' }}>
          <Icon name="tip" size={18} color={p.primary} />
          <View style={{ flex: 1 }}>
            <T variant="small">{s.personaTip[r.key]}</T>
          </View>
        </Row>
        <Button
          kind="tonal"
          label={act.label}
          onPress={() => {
            haptic.tap();
            router.push(act.to);
          }}
          testID="persona.act"
          style={{ alignSelf: 'flex-start' }}
        />
      </Card>

      <Card title={s.traitsTitle} testID="persona.traits">
        <T variant="small" muted>
          {s.personaIntro}
        </T>
        {r.traits.map((t) => (
          <TraitRow key={t.key} t={t} />
        ))}
        <View style={{ backgroundColor: p.surfaceMuted, borderRadius: Radii.md, padding: Space.md }}>
          <T variant="small" muted testID="persona.basis">
            {s.personaBasis(r.expenses, money(r.everydayMinor))}
          </T>
        </View>
      </Card>
    </Screen>
  );
}

function TraitRow({ t }: { t: Trait }) {
  const st = useAppState();
  const { s, p } = useUi();
  const cat = t.categoryId == null ? null : st.categoriesById.get(t.categoryId);
  const title = cat ? `${s.traitTitle[t.key]}: ${categoryLabel(cat, s)}` : s.traitTitle[t.key];
  return (
    <View testID={`persona.t.${t.key}`} style={{ gap: Space.xs }}>
      <LabeledProgress value={t.share} label={title} trailing={formatPercent(t.share)} />
      <Row gap={Space.xs}>
        <Icon name={t.strong ? 'trendUp' : 'scales'} size={14} color={t.strong ? p.primary : p.textSubtle} />
        <View style={{ flex: 1 }}>
          <T variant="small" muted testID={`persona.t.${t.key}.text`}>
            {`${t.strong ? s.traitStrong : s.traitNormal} · ${s.traitText(formatPercent(t.share), formatPercent(t.baseline))}`}
          </T>
        </View>
      </Row>
    </View>
  );
}
