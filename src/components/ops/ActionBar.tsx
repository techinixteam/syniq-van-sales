import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '@/components/common/AppButton';
import { useTheme } from '@/contexts/ThemeContext';
import { useKeyboardVisible } from '@/hooks/useKeyboardVisible';
import { actionBarCompact } from '@/components/ops/compact-rules';
import { textStyles } from '@/theme';

/**
 * The bar at the bottom of a document screen: what is on the sheet, and the one button that posts it.
 *
 * It IS pinned here, unlike syniq-web's create pages where a sticky action bar was tried and
 * rejected. A handheld is not a browser: the list above it can be forty lines, and an operator who
 * has to scroll to the bottom of a count sheet to find "Submit" scrolls past the line they were
 * about to fix. The screen is also short enough that a pinned bar costs little.
 *
 * `summary` carries the number the operator checks before they commit — "12 lines · 240 EA" — so
 * the last thing seen before an irreversible act is a figure, not a verb.
 *
 * `hideOnKeyboard` takes the whole bar away while the soft keyboard is up. The window is
 * `adjustResize`, so an open keyboard does not cover the bar — it LIFTS it, onto the row being
 * typed into, and the summary and both buttons then eat what little screen is left above the keys.
 * A screen that sets this must keep any action the operator needs mid-typing somewhere else (a
 * `HeaderButton`); the bar comes back the moment the keyboard goes down.
 *
 * `compact` turns the stack into ONE ROW — summary and hint on the left, the button beside them
 * instead of under them — and trims the vertical padding. It halves the bar's height, which on a
 * line-entry screen is two or three more rows of the delivery visible at once. It is for a bar
 * that carries a SECONDARY action (Save draft, with Post up in the header): the button stops being
 * full-width, and a full-width filled button is how this app says "this is the thing you came to
 * do". The 48-px touch floor is kept — the saving comes from the layout, not from the target.
 *
 * Left UNSET, `compact` follows the layout class: on a compact screen (the 4" MC2200) every
 * pinned bar is one row, because the stacked bar there was a quarter of the height a count sheet
 * had left. A screen can still say `compact={false}` to keep the stack. See `compact-rules.ts`.
 */
export const ActionBar: React.FC<{
  summary?: string;
  hint?: string;
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  primaryBusy?: boolean;
  destructive?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** The secondary action can be unavailable while the primary is not — "Save draft" before a
   *  transfer number has been typed, say. Omitted, it follows the busy flag as it always did. */
  secondaryDisabled?: boolean;
  /** Take the bar away while the soft keyboard is up — see the docblock. */
  hideOnKeyboard?: boolean;
  /** One row instead of a stack, and half the height — see the docblock. Unset ⇒ follows the layout. */
  compact?: boolean;
  style?: ViewStyle;
}> = ({
  summary,
  hint,
  primaryLabel,
  onPrimary,
  primaryDisabled = false,
  primaryBusy = false,
  destructive = false,
  secondaryLabel,
  onSecondary,
  secondaryDisabled = false,
  hideOnKeyboard = false,
  compact: compactProp,
  style,
}) => {
  const theme = useTheme();
  const compact = actionBarCompact(compactProp, theme.layout);
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();

  if (hideOnKeyboard && keyboardVisible) return null;

  const pad = compact ? theme.spacing.sm : theme.spacing.screenPadding;
  // Compact: auto-width buttons at the touch floor. Default: full-width at the house height.
  const buttonStyle: ViewStyle = compact
    ? { height: theme.spacing.touchTarget }
    : styles.grow;

  return (
    <View
      style={[
        styles.bar,
        theme.shadows.shell,
        compact ? styles.barCompact : null,
        {
          paddingHorizontal: theme.spacing.screenPadding,
          paddingTop: pad,
          paddingBottom: pad + insets.bottom,
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.line,
          gap: theme.spacing.sm,
        },
        style,
      ]}
    >
      {summary || hint ? (
        <View style={[compact ? styles.grow : null, { gap: 2 }]}>
          {summary ? (
            <Text style={[textStyles.bodyStrong, { color: theme.colors.ink }]}>{summary}</Text>
          ) : null}
          {hint ? (
            <Text style={[textStyles.caption, { color: theme.colors.ink2 }]}>{hint}</Text>
          ) : null}
        </View>
      ) : null}

      {/* Compact only: `flexShrink: 0` so a long hint beside it cannot squeeze the label out of
          the button. In the stacked layout the row is full-width and there is nothing to squeeze. */}
      <View style={[styles.row, compact ? styles.buttons : null, { gap: theme.spacing.sm }]}>
        {secondaryLabel && onSecondary ? (
          <AppButton
            label={secondaryLabel}
            variant="secondary"
            onPress={onSecondary}
            disabled={primaryBusy || secondaryDisabled}
            style={buttonStyle}
          />
        ) : null}
        <AppButton
          label={primaryLabel}
          variant={destructive ? 'destructive' : 'primary'}
          onPress={onPrimary}
          disabled={primaryDisabled}
          loading={primaryBusy}
          style={buttonStyle}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: { borderTopWidth: StyleSheet.hairlineWidth },
  barCompact: { flexDirection: 'row', alignItems: 'center' },
  row: { flexDirection: 'row' },
  buttons: { flexShrink: 0 },
  grow: { flex: 1 },
});
