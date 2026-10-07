import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TriangleAlert } from 'lucide-react-native';
import type { PricePreview } from '@/api/o2c.api';
import { errorMessage } from '@/api/errors';
import { Card } from '@/components/common/Card';
import { KeyValue } from '@/components/common/KeyValue';
import { AppButton } from '@/components/common/AppButton';
import { useTheme } from '@/contexts/ThemeContext';
import { textStyles } from '@/theme';
import { formatMoney } from '@/utils/money';

/**
 * The totals the SERVER worked out — and every reason it would refuse, as it said them. Nothing on
 * this card is computed on the phone.
 */
export const PricedSummary: React.FC<{
  preview: PricePreview | null;
  previewing: boolean;
  previewError: unknown;
  onRetry: () => void;
}> = ({ preview, previewing, previewError, onRetry }) => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const currency = preview?.determination.currency ?? 'SAR';

  if (previewError && !previewing) {
    return (
      <Card accent={theme.colors.negative}>
        <Text style={[textStyles.bodySmall, { color: theme.colors.negative }]}>{errorMessage(previewError, t)}</Text>
        <AppButton label={t('action.retry')} variant="ghost" onPress={onRetry} style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }} />
      </Card>
    );
  }

  return (
    <Card>
      <View style={{ gap: theme.spacing.xs }}>
        {previewing ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <ActivityIndicator color={theme.colors.brand} />
            <Text style={[textStyles.caption, { color: theme.colors.ink3 }]}>{t('sale.totals.pricing')}</Text>
          </View>
        ) : null}

        {preview?.problems.map((p, i) => {
          const translated = i18n.exists(`err.${p.code}`) ? t(`err.${p.code}`) : null;
          return (
            <View key={`${p.code}-${i}`} style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-start' }}>
              <TriangleAlert size={16} color={theme.colors.negative} />
              <View style={{ flex: 1 }}>
                <Text style={[textStyles.bodySmall, { color: theme.colors.negative }]}>{translated ?? p.message}</Text>
                {translated ? <Text style={[textStyles.caption, { color: theme.colors.ink3 }]}>{p.message}</Text> : null}
              </View>
            </View>
          );
        })}

        {preview?.totals ? (
          <>
            <KeyValue label={t('sale.totals.net')} value={formatMoney(preview.totals.netHalalas, currency)} />
            <KeyValue label={t('sale.totals.vat')} value={formatMoney(preview.totals.taxHalalas, currency)} />
            <KeyValue
              label={t('sale.totals.total')}
              value={formatMoney(preview.totals.grossHalalas, currency)}
              valueStyle={textStyles.h4}
            />
            {preview.determination.paymentTermsCode ? (
              <KeyValue label={t('sale.totals.terms')} value={preview.determination.paymentTermsCode} />
            ) : null}
          </>
        ) : !previewing && (preview?.problems.length ?? 0) === 0 ? (
          <Text style={[textStyles.caption, { color: theme.colors.ink3 }]}>{t('sale.totals.addLines')}</Text>
        ) : null}
      </View>
    </Card>
  );
};
