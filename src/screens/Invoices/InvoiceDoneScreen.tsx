import React, { useEffect } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CircleCheck } from 'lucide-react-native';
import { Screen } from '@/components/common/Screen';
import { AppButton } from '@/components/common/AppButton';
import { ReasonModal } from '@/components/sales/ReasonModal';
import { useTheme } from '@/contexts/ThemeContext';
import { useReadyVan } from '@/contexts/VanContext';
import { useInvoicePdf } from '@/hooks/useInvoicePdf';
import type { MainStackParamList } from '@/navigation/types';
import { textStyles } from '@/theme';
import { formatMoney } from '@/utils/money';

/**
 * The sale is POSTED. The invoice number is the server's; the PDF (the original — copy 1) is fetched
 * straight away in the background, so View and Share answer instantly at the counter.
 */
export const InvoiceDoneScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { params } = useRoute<RouteProp<MainStackParamList, 'InvoiceDone'>>();
  const { companyId } = useReadyVan();
  const pdf = useInvoicePdf({ invoiceId: params.invoiceId, companyId, docNumber: params.docNumber });
  const { prefetch } = pdf;

  useEffect(() => {
    void prefetch();
  }, [prefetch]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, gap: theme.spacing.lg, alignItems: 'center' }}>
        <CircleCheck size={64} color={theme.colors.positive} />
        <Text style={[textStyles.h2, { color: theme.colors.ink, textAlign: 'center' }]}>{t('invoice.done')}</Text>
        <Text style={[textStyles.code, { color: theme.colors.ink, fontSize: 22 }]}>{params.docNumber}</Text>
        <Text style={[textStyles.body, { color: theme.colors.ink2, textAlign: 'center' }]}>{params.customerName}</Text>
        {params.grossHalalas ? (
          <Text style={[textStyles.display, { color: theme.colors.ink }]}>{formatMoney(params.grossHalalas, params.currency)}</Text>
        ) : null}
        <View style={{ alignSelf: 'stretch', gap: theme.spacing.sm, marginTop: theme.spacing.lg }}>
          <AppButton label={t('invoice.viewPdf')} onPress={pdf.view} loading={pdf.busy === 'view'} disabled={pdf.busy != null} />
          <AppButton label={t('invoice.sharePdf')} variant="secondary" onPress={pdf.share} loading={pdf.busy === 'share'} disabled={pdf.busy != null} />
          <AppButton label={t('invoice.another')} variant="secondary" onPress={() => navigation.replace('NewInvoice')} />
          <AppButton label={t('action.done')} variant="ghost" onPress={() => navigation.popToTop()} />
        </View>
      </ScrollView>
      <ReasonModal visible={pdf.needsReason} busy={pdf.busy != null} onSubmit={pdf.submitReason} onCancel={pdf.cancelReason} />
    </Screen>
  );
};
