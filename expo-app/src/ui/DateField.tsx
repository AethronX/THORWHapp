import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { Day, dayFromDate, dayToDate } from '../core/dates';
import { useAppState, useUi } from './AppContext';
import { Icon, T } from './components';
import { formatDate } from './format';
import { MIN_TAP, Radii, Space } from './theme';

/** Calendar-day picker. Values are `Day`s, never time-zoned Dates. */
export function DateField({
  label,
  value,
  onChange,
  min,
  max,
  testID,
}: {
  label: string;
  value: Day;
  onChange: (d: Day) => void;
  min?: Day;
  max?: Day;
  testID?: string;
}) {
  const st = useAppState();
  const { p } = useUi();
  const [iosOpen, setIosOpen] = useState(false);

  function open() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: dayToDate(value),
        mode: 'date',
        minimumDate: min ? dayToDate(min) : undefined,
        maximumDate: max ? dayToDate(max) : undefined,
        onValueChange: (_e, date) => onChange(dayFromDate(date)),
      });
    } else {
      setIosOpen((o) => !o);
    }
  }

  return (
    <View style={{ gap: Space.xs }}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatDate(value, st.locale)}`}
        onPress={open}
        style={{ minHeight: MIN_TAP, flexDirection: 'row', alignItems: 'center', gap: Space.md, borderWidth: 1, borderColor: p.borderStrong, borderRadius: Radii.md, paddingHorizontal: Space.md, backgroundColor: p.surface }}
      >
        <Icon name="calendar" color={p.onSurfaceMuted} />
        <View style={{ flex: 1 }}>
          <T variant="small" muted>
            {label}
          </T>
          <T>{formatDate(value, st.locale)}</T>
        </View>
        <Icon name="edit" size={18} color={p.onSurfaceMuted} />
      </Pressable>
      {Platform.OS !== 'android' && iosOpen && (
        <View style={{ backgroundColor: p.surface, borderRadius: Radii.md, borderWidth: 1, borderColor: p.borderStrong, overflow: 'hidden' }}>
        <DateTimePicker
          // Follow the APP theme, not the phone's: otherwise a dark-mode phone draws white text on our light card.
          themeVariant={p.dark ? 'dark' : 'light'}
          accentColor={p.primary}
          textColor={p.onSurface}
          value={dayToDate(value)}
          mode="date"
          display="inline"
          minimumDate={min ? dayToDate(min) : undefined}
          maximumDate={max ? dayToDate(max) : undefined}
          onValueChange={(_e, date) => {
            onChange(dayFromDate(date));
            setIosOpen(false);
          }}
        />
        </View>
      )}
    </View>
  );
}
