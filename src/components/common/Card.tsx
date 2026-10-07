import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { textStyles } from '@/theme';

/**
 * The surface every grouped thing sits on — a document header, a line, a result panel.
 *
 * The web's equivalent is frosted glass (`backdrop-filter`), which React Native has no answer for,
 * so this is a flat `surface` card carrying the same border, radius and elevation. That divergence
 * is deliberate and recorded in the plan's §4.4.
 */
export const Card: React.FC<{
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  /** Renders a coloured left edge — used to mark a row as varied, short or refused. */
  accent?: string;
  accessibilityLabel?: string;
}> = ({ children, onPress, style, accent, accessibilityLabel }) => {
  const theme = useTheme();

  const base: ViewStyle = {
    borderRadius: theme.radius.tile,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.cardPadding,
    ...(accent ? { borderLeftWidth: 4, borderLeftColor: accent } : {}),
  };

  if (!onPress) {
    return <View style={[base, theme.shadows.card, style]}>{children}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        base,
        theme.shadows.card,
        // The whole card is the target. On a handheld held one-handed in gloves, a chevron-sized
        // hit area is a mis-tap, and a mis-tap here opens the wrong document.
        { minHeight: theme.spacing.touchTarget, borderColor: pressed ? theme.colors.brand : theme.colors.line },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
};

/** A titled group of cards. The heading disappears when there is nothing under it. */
export const Section: React.FC<{
  title?: string;
  hint?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}> = ({ title, hint, children, style }) => {
  const theme = useTheme();
  return (
    <View style={[{ gap: theme.spacing.sm }, style]}>
      {title ? (
        <View>
          <Text style={[textStyles.sectionLabel, { color: theme.colors.ink2 }]}>{title}</Text>
          {hint ? (
            <Text style={[textStyles.caption, { color: theme.colors.ink3, marginTop: 2 }]}>
              {hint}
            </Text>
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
};
