import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react-native';
import type { PackagingProfile } from '@/api/article.api';
import type { PreviewedLine } from '@/api/o2c.api';
import { Card } from '@/components/common/Card';
import { QtyField } from '@/components/ops/QtyField';
import { useTheme } from '@/contexts/ThemeContext';
import { textStyles } from '@/theme';
import { formatMoney } from '@/utils/money';
import { formatQty, fromScaled } from '@/utils/qty';
import { isSendableQty, type DraftLine } from '@/utils/sale-draft';

/**
 * One basket line: what it is, how many, in which unit — and, once the server has priced it, what it
 * costs the customer. The van's quantity sits underneath as a HINT (red when the basket wants more
 * than the van holds); the server is the one that refuses.
 */
export const LineEditor: React.FC<{
  line: DraftLine;
  index: number;
  profile?: PackagingProfile;
  priced?: PreviewedLine;
  currency: string;
  /** What the van holds of this article, base units ×10⁴. Undefined when not shown (a quotation). */
  onVan?: bigint;
  overVan?: boolean;
  onQty: (qty: string) => void;
  onUnit: (uomCode: string) => void;
  onRemove: () => void;
}> = ({ line, index, profile, priced, currency, onVan, overVan, onQty, onUnit, onRemove }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const levels = profile?.levels ?? [];
  const qtyBad = line.qty !== '' && !isSendableQty(line.qty);

  return (
    <Card accent={overVan ? theme.colors.negative : undefined}>
      <View style={{ gap: theme.spacing.sm }}>
        <View style={[styles.row, { gap: theme.spacing.sm }]}>
          <Text style={[textStyles.code, { color: theme.colors.ink3 }]}>{index + 1}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[textStyles.bodyStrong, { color: theme.colors.ink }]} numberOfLines={2}>
              {line.name}
            </Text>
            <Text style={[textStyles.code, { color: theme.colors.ink3, fontSize: 12 }]}>
              {[line.articleNumber, line.barcode].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={t('action.remove')} onPress={onRemove} hitSlop={10}>
            <Trash2 size={20} color={theme.colors.negative} />
          </Pressable>
        </View>

        {levels.length > 1 ? (
          <View style={[styles.row, styles.wrap, { gap: theme.spacing.xs }]}>
            {levels.map((l) => {
              const selected = l.uomCode === line.uomCode;
              return (
                <Pressable
                  key={l.uomCode}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => onUnit(l.uomCode)}
                  style={{
                    paddingHorizontal: theme.spacing.chipPaddingHorizontal,
                    height: theme.spacing.chipHeight,
                    justifyContent: 'center',
                    borderRadius: theme.radius.control,
                    borderWidth: 1,
                    borderColor: selected ? theme.colors.brand : theme.colors.line,
                    backgroundColor: selected ? theme.colors.brandSubtle : theme.colors.surface,
                  }}
                >
                  <Text style={[textStyles.label, { color: selected ? theme.colors.brand : theme.colors.ink2 }]}>
                    {l.uomLabel ?? l.uomCode}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <QtyField
          value={line.qty}
          onChange={onQty}
          uomCode={line.uomCode ?? '—'}
          error={qtyBad ? t('sale.lines.badQty') : line.uomCode == null ? t('sale.lines.noUnit') : null}
        />

        {onVan !== undefined ? (
          <Text style={[textStyles.caption, { color: overVan ? theme.colors.negative : theme.colors.ink2 }]}>
            {overVan
              ? t('sale.lines.overVan', { qty: formatQty(fromScaled(onVan)), unit: profile?.base ?? '' })
              : t('sale.lines.onVanUnit', { qty: formatQty(fromScaled(onVan)), unit: profile?.base ?? '' })}
          </Text>
        ) : null}

        {priced ? (
          <View style={[styles.row, styles.between]}>
            <Text style={[textStyles.caption, { color: theme.colors.ink2 }]}>
              {t('sale.lines.vat', { rate: (priced.taxRateBps / 100).toString() })}
            </Text>
            <Text style={[textStyles.bodyStrong, { color: theme.colors.ink }]}>{formatMoney(priced.grossHalalas, currency)}</Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  wrap: { flexWrap: 'wrap' },
  between: { justifyContent: 'space-between' },
});
