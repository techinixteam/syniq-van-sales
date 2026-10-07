import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { Badge, type Semantic } from '@/components/common/Badge';
import { useTheme } from '@/contexts/ThemeContext';
import { textStyles } from '@/theme';
import { formatQty } from '@/utils/qty';

/**
 * One article on a document — the row every line list is built from.
 *
 * ⭐ THE THREE IDENTIFIERS ARE ALL PRESENT, ALWAYS. Name, business number and barcode. This is the
 * same rule the B2B order lines follow, and it exists because each answers a different question:
 * the NAME is what the operator compares against the carton in their hand, the NUMBER is what the
 * buyer quotes, and the BARCODE is what they can re-scan to prove they have the right row. A line
 * showing only a name is one nobody can check.
 *
 * `flash` marks the row that just arrived from a scan. A warehouse user scanning into a
 * forty-line list needs to see WHERE their scan landed; without it they scan again to be sure, and
 * the second scan is a second line.
 */
export const ArticleLine: React.FC<{
  name: string;
  /**
   * The line's position on the document — 1, 2, 3 and on. Rendered as a leading ordinal.
   *
   * It is what an operator says out loud ("line four is short") and what the person on the other
   * end of the phone looks for on the paper, so a list that can be counted has to show it rather
   * than make them count down the screen. Omitted on lists where the position means nothing.
   */
  lineNo?: number | null;
  /** The 10-digit business number, or the ART- handle when the numeric one is absent. */
  articleNumber?: string | null;
  barcode?: string | null;
  /** Quantity as a decimal string. Rendered through `formatQty`, never raw. */
  qty?: string | null;
  uomCode?: string | null;
  /**
   * What that unit holds — "CS (24 EA)", composed by the server. Shown INSTEAD of the bare code
   * when present, because a receiver reading "3 CS" over a pallet is asking exactly this.
   */
  uomLabel?: string | null;
  /** A second figure beside the quantity — "of 240", the system figure, the shortfall. */
  qtySuffix?: string;
  /** A short chip: a stock status, a shortfall state, a batch. */
  tag?: { label: string; tone?: Semantic };
  /** Right-aligned free text under the quantity, e.g. a batch or an expiry. */
  note?: string;
  flash?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
  removeLabel?: string;
  style?: ViewStyle;
}> = ({
  name,
  lineNo,
  articleNumber,
  barcode,
  qty,
  uomCode,
  uomLabel,
  qtySuffix,
  tag,
  note,
  flash = false,
  onPress,
  onRemove,
  removeLabel,
  style,
}) => {
  const theme = useTheme();

  const body = (
    <View style={[styles.row, { gap: theme.spacing.md }]}>
      {lineNo != null ? (
        // Its own column rather than a prefix on the name: the name wraps to two lines and a
        // prefix would leave the second line hanging under the digits. Monospaced and right-set so
        // 9 and 10 stack into a column an eye can run down.
        <Text style={[textStyles.code, styles.ordinal, { color: theme.colors.ink3 }]}>{lineNo}</Text>
      ) : null}

      <View style={styles.identity}>
        <Text numberOfLines={2} style={[textStyles.bodyStrong, { color: theme.colors.ink }]}>
          {name}
        </Text>
        <Text numberOfLines={1} style={[textStyles.caption, { color: theme.colors.ink2 }]}>
          {[articleNumber, barcode].filter(Boolean).join(' · ') || '—'}
        </Text>
        {tag ? <Badge label={tag.label} tone={tag.tone ?? 'neutral'} style={styles.tag} /> : null}
      </View>

      <View style={styles.figures}>
        {qty != null ? (
          <Text style={[textStyles.code, { color: theme.colors.ink, fontSize: 18 }]}>
            {formatQty(qty)}
            {uomLabel ?? uomCode ? (
              <Text style={textStyles.caption}> {uomLabel ?? uomCode}</Text>
            ) : null}
          </Text>
        ) : null}
        {qtySuffix ? (
          <Text style={[textStyles.caption, { color: theme.colors.ink2 }]}>{qtySuffix}</Text>
        ) : null}
        {note ? (
          <Text style={[textStyles.caption, { color: theme.colors.ink3 }]}>{note}</Text>
        ) : null}
      </View>

      {onRemove ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={removeLabel ?? 'remove'}
          onPress={onRemove}
          hitSlop={10}
          style={styles.remove}
        >
          <Trash2 size={20} color={theme.colors.negative} />
        </Pressable>
      ) : null}
    </View>
  );

  const container: ViewStyle = {
    padding: theme.spacing.md,
    borderRadius: theme.radius.control,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: flash ? theme.colors.brand : theme.colors.line,
    backgroundColor: flash ? theme.colors.brandSubtle : theme.colors.surface,
    minHeight: theme.spacing.touchTarget,
  };

  if (!onPress) return <View style={[container, style]}>{body}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      onPress={onPress}
      style={({ pressed }) => [
        container,
        pressed ? { borderColor: theme.colors.brand } : null,
        style,
      ]}
    >
      {body}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  ordinal: { minWidth: 20, textAlign: 'right', paddingTop: 1 },
  identity: { flex: 1, gap: 2 },
  figures: { alignItems: 'flex-end', gap: 2 },
  tag: { marginTop: 4 },
  remove: { paddingTop: 2 },
});
