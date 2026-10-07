import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { textStyles } from '@/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

/**
 * The house button.
 *
 * Height comes from `spacing.buttonHeight` (56) rather than from padding, so a translated label —
 * Arabic runs longer than English — cannot change how tall a row of buttons is.
 */
export const AppButton: React.FC<{
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}> = ({ label, onPress, variant = 'primary', disabled = false, loading = false, style }) => {
  const theme = useTheme();
  const inert = disabled || loading;

  const fills: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
    primary: { bg: theme.colors.brand, fg: theme.colors.onBrand, border: theme.colors.brand },
    secondary: { bg: theme.colors.surface, fg: theme.colors.ink, border: theme.colors.field },
    ghost: { bg: 'transparent', fg: theme.colors.brand, border: 'transparent' },
    destructive: {
      bg: theme.colors.negative,
      fg: theme.colors.onNegative,
      border: theme.colors.negative,
    },
  };
  const fill = fills[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inert, busy: loading }}
      disabled={inert}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          height: theme.spacing.buttonHeight,
          paddingHorizontal: theme.spacing.buttonPaddingHorizontal,
          borderRadius: theme.radius.control,
          backgroundColor: fill.bg,
          borderColor: fill.border,
          opacity: inert ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fill.fg} />
      ) : (
        <Text numberOfLines={1} style={[textStyles.button, { color: fill.fg }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});
