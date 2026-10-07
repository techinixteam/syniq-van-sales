import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { textStyles } from '@/theme';
import { addQty, isQty, subQty, toScaled } from '@/utils/qty';

/**
 * A quantity, entered in gloves.
 *
 * ⚠ THE VALUE IS A STRING THROUGHOUT, AND NEVER BECOMES A `number`. Quantities are `Decimal(18,4)`
 * on the wire, and a field that parses to a float and formats back has already lost the fourth
 * decimal on a weighed item. `+`/`−` go through `utils/qty`, which is exact bigint arithmetic.
 *
 * ⚠ THE FIELD ACCEPTS A PARTIAL VALUE. Rejecting "1." as you type makes a decimal impossible to
 * enter, so anything that COULD become a number is allowed through and validity is reported
 * separately. Callers gate their action bar on `isQty`, not on the field.
 *
 * `keyboardType="decimal-pad"` rather than `numeric`: the numeric pad on Android carries a minus
 * sign and a comma, and a comma typed into a decimal here is a value the server refuses.
 */
export const QtyField: React.FC<{
  value: string;
  onChange: (next: string) => void;
  /** The unit, printed beside the field. ⚠ NEVER omit it on a receiving screen — see `utils/po.ts`. */
  uomCode?: string | null;
  label?: string;
  /** The step for +/−. Whole units by default; a weighed item wants a smaller one. */
  step?: string;
  /** Shown under the field. Use it for "still to come: 180 EA", not for an error. */
  hint?: string;
  error?: string | null;
  autoFocus?: boolean;
  editable?: boolean;
  /** Renders at display size (34pt). For the one figure a screen exists to capture. */
  large?: boolean;
}> = ({
  value,
  onChange,
  uomCode,
  label,
  step = '1',
  hint,
  error,
  autoFocus = false,
  editable = true,
  large = false,
}) => {
  const theme = useTheme();

  const bump = useCallback(
    (direction: 1 | -1) => {
      const base = isQty(value) ? value : '0';
      const next = direction === 1 ? addQty(base, step) : subQty(base, step);
      // A negative quantity is not a thing any document here accepts, and the server refuses it
      // with a 400 — clamping at zero is kinder than a red toast for pressing "−" once too often.
      onChange(toScaled(next) < 0n ? '0' : next);
    },
    [value, step, onChange],
  );

  const invalid = value !== '' && !isQty(value);

  return (
    <View style={{ gap: theme.spacing.xs }}>
      {label ? <Text style={[textStyles.label, { color: theme.colors.ink2 }]}>{label}</Text> : null}

      <View style={[styles.row, { gap: theme.spacing.sm }]}>
        {editable ? (
          <StepButton icon="minus" onPress={() => bump(-1)} />
        ) : null}

        <View
          style={[
            styles.fieldWrap,
            {
              // The display figure still fits 56 (its line-height is 40); 72 was head-room.
              height: large ? (theme.layout === 'compact' ? 56 : 72) : theme.spacing.inputHeight,
              paddingHorizontal: theme.spacing.inputPaddingHorizontal,
              borderRadius: theme.radius.control,
              borderColor: error || invalid ? theme.colors.negative : theme.colors.field,
              backgroundColor: editable ? theme.colors.surface : theme.colors.surface3,
            },
          ]}
        >
          <TextInput
            accessibilityLabel={label}
            value={value}
            onChangeText={onChange}
            editable={editable}
            keyboardType="decimal-pad"
            autoFocus={autoFocus}
            selectTextOnFocus
            placeholder="0"
            placeholderTextColor={theme.colors.ink3}
            style={[
              large ? textStyles.display : textStyles.code,
              styles.input,
              { color: theme.colors.ink, textAlign: 'right' },
            ]}
          />
          {uomCode ? (
            <Text style={[textStyles.label, { color: theme.colors.ink2 }]}>{uomCode}</Text>
          ) : null}
        </View>

        {editable ? <StepButton icon="plus" onPress={() => bump(1)} /> : null}
      </View>

      {error ? (
        <Text style={[textStyles.caption, { color: theme.colors.negative }]}>{error}</Text>
      ) : hint ? (
        <Text style={[textStyles.caption, { color: theme.colors.ink3 }]}>{hint}</Text>
      ) : null}
    </View>
  );
};

/** 48×48 minimum, per `spacing.touchTarget`. A smaller step button is a mis-tap in an aisle. */
const StepButton: React.FC<{ icon: 'plus' | 'minus'; onPress: () => void }> = ({ icon, onPress }) => {
  const theme = useTheme();
  const Icon = icon === 'plus' ? Plus : Minus;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={icon}
      onPress={onPress}
      style={({ pressed }) => [
        styles.step,
        {
          width: theme.spacing.touchTarget,
          height: theme.spacing.touchTarget,
          borderRadius: theme.radius.control,
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: theme.colors.field,
          backgroundColor: pressed ? theme.colors.surface3 : theme.colors.surface,
        },
      ]}
    >
      <Icon size={22} color={theme.colors.ink} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  fieldWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  input: { flex: 1, padding: 0 },
  step: { alignItems: 'center', justifyContent: 'center' },
});
