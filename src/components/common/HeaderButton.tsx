import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { textStyles } from '@/theme';

export type HeaderButtonTone = 'brand' | 'negative';

/**
 * A document action that lives in the navigation header rather than in the bottom bar.
 *
 * It exists for the actions that must stay reachable WHILE THE KEYBOARD IS UP. The bottom
 * `ActionBar` is taken away for the duration (an `adjustResize` window pins it directly above the
 * keys), and a receipt being keyed one line at a time cannot lose its "Post" for the whole of that.
 *
 * ⚠ SHORT LABELS ONLY. The native stack gives the header a fixed height and truncates the TITLE to
 * fit its right-hand accessory, so "Post" belongs here and "Post receipt" belongs on the
 * confirmation that follows. A 56-px header cannot hold the 48-px pill the touch floor asks for,
 * so the visible fill is 40 and hit slop carries the target past the floor in both directions —
 * this is tapped in gloves, and a mis-tap here opens the posting confirmation.
 */
export const HeaderButton: React.FC<{
  label: string;
  onPress: () => void;
  tone?: HeaderButtonTone;
  disabled?: boolean;
  busy?: boolean;
}> = ({ label, onPress, tone = 'brand', disabled = false, busy = false }) => {
  const theme = useTheme();
  const inert = disabled || busy;

  const fills: Record<HeaderButtonTone, { bg: string; fg: string }> = {
    brand: { bg: theme.colors.brand, fg: theme.colors.onBrand },
    negative: { bg: theme.colors.negative, fg: theme.colors.onNegative },
  };
  const fill = fills[tone];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inert, busy }}
      disabled={inert}
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={({ pressed }) => [
        styles.base,
        {
          paddingHorizontal: theme.spacing.md,
          borderRadius: theme.radius.control,
          backgroundColor: fill.bg,
          opacity: inert ? 0.45 : pressed ? 0.85 : 1,
        },
      ]}
    >
      {busy ? (
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
    height: 40,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
