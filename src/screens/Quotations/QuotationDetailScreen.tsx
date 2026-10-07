import React, { useCallback } from 'react';
import { ScrollView, Share, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { getMyQuotationApi } from '@/api/van-sale.api';
import { Screen } from '@/components/common/Screen';
import { Card, Section } from '@/components/common/Card';
import { KeyValue } from '@/components/common/KeyValue';
import { StatusBadge } from '@/components/common/Badge';
import { AppButton } from '@/components/common/AppButton';
import { ErrorState, Loading } from '@/components/common/States';
import { useTheme } from '@/contexts/ThemeContext';
import { useReadyVan } from '@/contexts/VanContext';
import { useAsync } from '@/hooks/useAsync';
import type { MainStackParamList } from '@/navigation/types';
import { textStyles } from '@/theme';
import { formatMoney } from '@/utils/money';
import { formatQty } from '@/utils/qty';
import { quotationText } from '@/utils/quotation-text';

/**
 * One of the rep's own quotations — the figures as the server priced them — and "Share", which
 * sends it as a text message (there is no quotation PDF). Sending / accepting / converting it into
 * an order stays with the office.
 */
export const QuotationDetailScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { params } = useRoute<RouteProp<MainStackParamList, 'QuotationDetail'>>();
  const { companyId } = useReadyVan();
  const loader = useCallback(() => getMyQuotationApi(params.quotationId, companyId), [params.quotationId, companyId]);
  const { data: q, loading, error, reload } = useAsync(loader);
  const ar = i18n.language === 'ar';

  if (loading && !q) return <Screen><Loading /></Screen>;
  if (error || !q) return <Screen><ErrorState error={error} onRetry={reload} /></Screen>;

  const share = () => {
    void Share.share({ title: `${t('quote.share.title')} ${q.code}`, message: quotationText(q, t, ar) });
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.screenPadding, gap: theme.spacing.lg }}>
        <Card>
          <View style={{ gap: theme.spacing.xs }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[textStyles.code, { color: theme.colors.ink, fontSize: 18 }]}>{q.code}</Text>
              <StatusBadge status={q.effectiveStatus} label={t(`quote.status.${q.effectiveStatus}`)} />
            </View>
            <KeyValue label={t('invoice.customer')} value={q.customerName ?? q.customerId} />
            <KeyValue label={t('quote.validFrom')} value={q.validFrom.slice(0, 10)} />
            <KeyValue label={t('quote.validTo')} value={q.validTo.slice(0, 10)} />
            {q.customerRef ? <KeyValue label={t('sale.customerRef')} value={q.customerRef} /> : null}
            {q.paymentTermsCode ? <KeyValue label={t('sale.totals.terms')} value={q.paymentTermsCode} /> : null}
            {q.notes ? <KeyValue label={t('quote.notes')} value={q.notes} /> : null}
          </View>
        </Card>

        <Section title={t('sale.lines.title')}>
          {q.lines.map((l) => (
            <Card key={l.id}>
              <Text style={[textStyles.bodyStrong, { color: theme.colors.ink }]}>
                {(ar ? l.articleNameAr || l.articleNameEn : l.articleNameEn || l.articleNameAr) ?? l.articleId}
              </Text>
              <Text style={[textStyles.code, { color: theme.colors.ink3, fontSize: 12 }]}>{l.articleNumber ?? ''}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: theme.spacing.xs }}>
                <Text style={[textStyles.bodySmall, { color: theme.colors.ink2 }]}>
                  {formatQty(l.qty)} {l.uomCode} · {t('sale.lines.vat', { rate: (l.taxRateBps / 100).toString() })}
                </Text>
                <Text style={[textStyles.bodyStrong, { color: theme.colors.ink }]}>{formatMoney(l.netHalalas, q.currency)}</Text>
              </View>
            </Card>
          ))}
        </Section>

        <Card>
          <KeyValue label={t('sale.totals.net')} value={formatMoney(q.netHalalas, q.currency)} />
          <KeyValue label={t('sale.totals.vat')} value={formatMoney(q.taxHalalas, q.currency)} />
          <KeyValue label={t('sale.totals.total')} value={formatMoney(q.grossHalalas, q.currency)} valueStyle={textStyles.h4} />
        </Card>

        <AppButton label={t('quote.shareText')} onPress={share} />
        <Text style={[textStyles.caption, { color: theme.colors.ink3, textAlign: 'center' }]}>{t('quote.officeNext')}</Text>
      </ScrollView>
    </Screen>
  );
};
