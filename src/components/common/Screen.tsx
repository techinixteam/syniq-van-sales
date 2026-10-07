import React from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * The page ground. Paints the canvas colour and respects the safe area.
 *
 * `scroll` is opt-in rather than default: a scan-entry screen must NOT scroll its input out from
 * under the operator's thumb when the keyboard opens, and a list screen brings its own FlatList.
 */
export const Screen: React.FC<{
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  /** Pad the bottom for a sticky action bar. */
  footerInset?: number;
}> = ({ children, scroll = false, style, footerInset = 0 }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const base: ViewStyle = {
    flex: 1,
    backgroundColor: theme.colors.canvas,
    paddingTop: insets.top,
  };

  if (!scroll) {
    return <View style={[base, style]}>{children}</View>;
  }

  return (
    <View style={base}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + theme.spacing.xl + footerInset },
          style,
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  content: { flexGrow: 1 },
});
