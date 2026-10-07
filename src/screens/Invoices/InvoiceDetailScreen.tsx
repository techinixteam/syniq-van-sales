import React, { useCallback } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { getInvoiceApi } from '@/api/invoice.api';
import { Screen } from '@/components/common/Screen';
import { Card, Section } from '@/components/common/Card';
import { KeyValue } from '@/components/common/KeyValue';
import { StatusBadge } from '@/components/common/Badge';
import { AppButton } from '@/components/common/AppButton';
import { ErrorState, Loading } from '@/components/common/States';
import { ReasonModal } from '@/components/sales/ReasonModal';
import { useTheme } from '@/contexts/ThemeContext';
import { useReadyVan } from '@/contexts/VanContext';
import { useAsync } from '@/hooks/useAsync';
import { useInvoicePdf } from '@/hooks/useInvoicePdf';
import type { MainStackParamList } from '@/navigation/types';
import { textStyles } from '@/theme';
import { formatMoney, toHalalas } from '@/utils/money';
import { formatQty } from '@/utils/qty';

/** One tax invoice: who, what, how much, whether it is paid — and the PDF to show or send. */
export const InvoiceDetailScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { params } = useRoute<RouteProp<MainStackParamList, 'InvoiceDetail'>>();
  const { companyId } = useReadyVan();
  const loader = useCallback(() => getInvoiceApi(params.invoiceId, companyId), [params.invoiceId, companyId]);
  const { data: inv, loading, error, reload } = useAsync(loader);
  const pdf = useInvoicePdf({ invoiceId: params.invoiceId, companyId, docNumber: inv?.docNumber ?? params.docNumber ?? params.invoiceId });

  if (loading && !inv) return <Screen><Loading /></Screen>;
  if (error || !inv) return <Screen><ErrorState error={error} onRetry={reload} /></Screen>;

  const open = inv.openItems.reduce((acc, o) => acc + (toHalalas(o.openAmountTxnHalalas) ?? 0n), 0n);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.screenPadding, gap: theme.spacing.lg }}>
        <Card>
          <View style={{ gap: theme.spacing.xs }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[textStyles.code, { color: theme.colors.ink, fontSize: 18 }]}>{inv.docNumber}</Text>
              <StatusBadge status={inv.status} label={t(`invoice.status.${inv.status}`, { defaultValue: inv.status })} />
            </View>
            <KeyValue label={t('invoice.customer')} value={inv.buyerPartySnapshot?.registrationName ?? inv.customerId} />
            {inv.buyerPartySnapshot?.vatNumber ? <KeyValue label={t('invoice.vatNo')} value={inv.buyerPartySnapshot.vatNumber} mono /> : null}
            <KeyValue label={t('invoice.date')} value={inv.invoiceDate.slice(0, 10)} />
            {inv.customerRef ? <KeyValue label={t('sale.customerRef')} value={inv.customerRef} /> : null}
            {inv.eInvoice ? <KeyValue label={t('invoice.zatca')} value={t(`invoice.zatcaStatus.${inv.eInvoice.status}`, { defaultValue: inv.eInvoice.status })} /> : null}
          </View>
        </Card>

        <Section title={t('sale.lines.title')}>
          {inv.lines.map((l) => (
            <Card key={l.id}>
              <Text style={[textStyles.bodyStrong, { color: theme.colors.ink }]}>{l.description}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: theme.spacing.xs }}>
                <Text style={[textStyles.bodySmall, { color: theme.colors.ink2 }]}>
                  {formatQty(l.qty)} {l.uomCode} · {t('sale.lines.vat', { rate: (l.taxRateBps / 100).toString() })}
                </Text>
                <Text style={[textStyles.bodyStrong, { color: theme.colors.ink }]}>{formatMoney(l.netHalalas, inv.currency)}</Text>
              </View>
            </Card>
          ))}
        </Section>

        <Card>
          <KeyValue label={t('sale.totals.net')} value={formatMoney(inv.netHalalas, inv.currency)} />
          <KeyValue label={t('sale.totals.vat')} value={formatMoney(inv.taxHalalas, inv.currency)} />
          <KeyValue label={t('sale.totals.total')} value={formatMoney(inv.grossHalalas, inv.currency)} valueStyle={textStyles.h4} />
          <KeyValue
            label={t('invoice.open')}
            value={formatMoney(open.toString(), inv.currency)}
            color={open > 0n ? theme.colors.critical : theme.colors.positive}
          />
        </Card>

        <View style={{ gap: theme.spacing.sm }}>
          <AppButton label={t('invoice.viewPdf')} onPress={pdf.view} loading={pdf.busy === 'view'} disabled={pdf.busy != null} />
          <AppButton label={t('invoice.sharePdf')} variant="secondary" onPress={pdf.share} loading={pdf.busy === 'share'} disabled={pdf.busy != null} />
        </View>
      </ScrollView>
      <ReasonModal visible={pdf.needsReason} busy={pdf.busy != null} onSubmit={pdf.submitReason} onCancel={pdf.cancelReason} />
    </Screen>
  );
};
