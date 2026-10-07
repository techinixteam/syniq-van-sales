import React from 'react';
import { StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { textStyles } from '@/theme';

/**
 * A labelled fact. The whole of this app's read surface is built from these.
 *
 * The value wins the space, not the label: an article name or a batch number is what the operator
 * is comparing against the thing in their hand, and a label column wide enough for the longest
 * Arabic caption would squeeze it. `mono` is for anything that gets compared DIGIT BY DIGIT —
 * article numbers, GTINs, quantities — where a proportional face hides a transposition.
 */
export const KeyValue: React.FC<{
  label: string;
  value: string | null | undefined;
  mono?: boolean;
  /** Overrides the ink colour — used to carry a semantic (a variance, a shortfall). */
  color?: string;
  style?: ViewStyle;
  valueStyle?: TextStyle;
}> = ({ label, value, mono, color, style, valueStyle }) => {
  const theme = useTheme();
  return (
    <View style={[styles.row, style]}>
      <Text style={[textStyles.label, styles.label, { color: theme.colors.ink2 }]}>{label}</Text>
      <Text
        // A branch code or a batch number is worth wrapping rather than truncating: the middle of
        // it is often what differs.
        style={[
          mono ? textStyles.code : textStyles.body,
          styles.value,
          { color: color ?? theme.colors.ink },
          valueStyle,
        ]}
      >
        {value == null || value === '' ? '—' : value}
      </Text>
    </View>
  );
};

/** The same fact stacked, for a narrow column or a long value. */
export const KeyValueStacked: React.FC<{
  label: string;
  value: string | null | undefined;
  mono?: boolean;
  color?: string;
  style?: ViewStyle;
}> = ({ label, value, mono, color, style }) => {
  const theme = useTheme();
  return (
    <View style={style}>
      <Text style={[textStyles.caption, { color: theme.colors.ink3 }]}>{label}</Text>
      <Text style={[mono ? textStyles.code : textStyles.bodyStrong, { color: color ?? theme.colors.ink }]}>
        {value == null || value === '' ? '—' : value}
      </Text>
    </View>
  );
};

/**
 * The big number. For the one figure a screen exists to show — on-hand, the price, the variance.
 *
 * 34pt, because this is read across a bay rather than held to the face.
 */
export const BigFigure: React.FC<{
  value: string;
  caption?: string;
  color?: string;
  style?: ViewStyle;
}> = ({ value, caption, color, style }) => {
  const theme = useTheme();
  return (
    <View style={[{ gap: 2 }, style]}>
      <Text style={[textStyles.display, { color: color ?? theme.colors.ink }]}>{value}</Text>
      {caption ? (
        <Text style={[textStyles.label, { color: theme.colors.ink2 }]}>{caption}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 4 },
  label: { width: 116 },
  value: { flex: 1 },
});
