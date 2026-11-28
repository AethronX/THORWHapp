import { Pressable, ScrollView, View } from 'react-native';

import { useUi } from './AppContext';
import { T } from './components';
import { Radii, Space } from './theme';

/**
 * One choice out of a few, as a row of chips (radio semantics for screen
 * readers). `scroll` keeps a long list on one line instead of wrapping.
 */
export function Chips<V extends string>({
  value,
  options,
  onChange,
  testID,
  scroll = false,
}: {
  value: V;
  options: readonly (readonly [V, string])[];
  onChange: (v: V) => void;
  testID: string;
  scroll?: boolean;
}) {
  const { p } = useUi();
  const chips = options.map(([v, label]) => {
    const selected = v === value;
    return (
      <Pressable
        key={v}
        testID={`${testID}.${v}`}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={label}
        hitSlop={{ top: 4, bottom: 4 }}
        onPress={() => onChange(v)}
        style={{
          minHeight: 40,
          justifyContent: 'center',
          paddingHorizontal: Space.md,
          borderRadius: Radii.pill,
          borderWidth: 1,
          borderColor: selected ? p.primary : p.outline,
          backgroundColor: selected ? p.primaryContainer : p.surface,
        }}
      >
        <T variant="label" color={selected ? p.onPrimaryContainer : p.onSurface}>
          {label}
        </T>
      </Pressable>
    );
  });
  return scroll ? (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="radiogroup" contentContainerStyle={{ gap: Space.xs }}>
      {chips}
    </ScrollView>
  ) : (
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Space.xs }}>
      {chips}
    </View>
  );
}
