import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { CalendarDays, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { textStyles } from '@/theme';
import { fromCivilDate, toCivilDate } from '@/utils/civil-date';

/**
 * A calendar date, picked from the device's own calendar.
 *
 * This replaces a text field that asked a receiver to type `YYYY-MM-DD`. On a handheld, at a dock,
 * one-handed, often gloved, that is a slow and error-prone thing to ask for: the numeric keypad has
 * no hyphen, a transposed digit is invisible, and `2027-31-03` is refused only after the whole
 * delivery has been keyed. A calendar cannot produce a date that does not exist.
 *
 * The value is a CIVIL date string (`YYYY-MM-DD`) in and out. The conversion runs through
 * `utils/civil-date.ts` and never through `toISOString()` — see that file for why a UTC round-trip
 * dates a Riyadh receiver's carton to the day before.
 *
 * The whole row is the tap target, not a small icon: the field is used standing up, in a hurry.
 */
export const DateField: React.FC<{
  label: string;
  value: string;
  onChange: (civilDate: string) => void;
  /** Shown under the field — remaining shelf life, or why the date is refused. */
  hint?: string | null;
  /** Renders the hint and the border in the warning colour. */
  warn?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
}> = ({ label, value, onChange, hint, warn, minimumDate, maximumDate }) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const handle = (event: DateTimePickerEvent, picked?: Date): void => {
    // Android's dialog dismisses itself; iOS's inline spinner stays until the user leaves it.
    setOpen(Platform.OS === 'ios' && event.type !== 'dismissed');
    if (event.type === 'set' && picked) onChange(toCivilDate(picked));
  };

  const borderColor = warn ? theme.colors.critical : theme.colors.field;

  return (
    <View style={styles.wrap}>
      <Text style={[textStyles.label, { color: theme.colors.ink2, marginBottom: theme.spacing.xs }]}>{label}</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: value || t('common.notSet', 'not set') }}
        onPress={() => setOpen(true)}
        style={[
          styles.row,
          {
            height: theme.spacing.inputHeight,
            paddingHorizontal: theme.spacing.inputPaddingHorizontal,
            borderRadius: theme.radius.control,
            borderWidth: StyleSheet.hairlineWidth * 2,
            borderColor,
            backgroundColor: theme.colors.surface,
          },
        ]}
      >
        <CalendarDays size={20} color={theme.colors.ink2} />
        {/* dir LTR: a date is read left-to-right even in an Arabic layout. */}
        <Text
          style={[textStyles.body, styles.value, { color: value ? theme.colors.ink : theme.colors.ink3 }]}
          numberOfLines={1}
        >
          {value || t('common.pickDate', 'Pick a date')}
        </Text>
        {value ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.clear', 'Clear')}
            hitSlop={12}
            onPress={() => onChange('')}
          >
            <X size={18} color={theme.colors.ink3} />
          </Pressable>
        ) : null}
      </Pressable>

      {hint ? (
        <Text style={[textStyles.caption, { color: warn ? theme.colors.critical : theme.colors.ink3, marginTop: theme.spacing.xs }]}>
          {hint}
        </Text>
      ) : null}

      {open ? (
        <DateTimePicker
          value={fromCivilDate(value) ?? new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handle}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  row: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 8 },
  value: { flex: 1, writingDirection: 'ltr' },
});
