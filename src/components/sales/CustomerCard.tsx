import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getCreditExposureApi, type CreditExposure, type CustomerHit } from '@/api/customer.api';
import { Card } from '@/components/common/Card';
import { AppButton } from '@/components/common/AppButton';
import { KeyValue } from '@/components/common/KeyValue';
import { useTheme } from '@/contexts/ThemeContext';
import { textStyles } from '@/theme';
import { formatMoney, toHalalas } from '@/utils/money';

/**
 * The chosen customer, with what credit control currently thinks of them.
 *
 * The exposure is a CACHE on the server (it says so) — a hint so the rep does not build a basket
 * for a customer who cannot be invoiced. The real decision is taken when the invoice posts.
 */
export const CustomerCard: React.FC<{
  companyId: string;
  customer: CustomerHit;
  onChange?: () => void;
  showCredit?: boolean;
}> = ({ companyId, customer, onChange, showCredit = true }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [credit, setCredit] = useState<CreditExposure | null>(null);
  const [creditFailed, setCreditFailed] = useState(false);

  useEffect(() => {
    if (!showCredit) return;
    let cancelled = false;
    setCredit(null);
    setCreditFailed(false);
    getCreditExposureApi(companyId, customer.id)
      .then((c) => !cancelled && setCredit(c))
      .catch(() => !cancelled && setCreditFailed(true));
    return () => {
      cancelled = true;
    };
  }, [companyId, customer.id, showCredit]);

  const available = credit?.computed ? toHalalas(credit.availableBaseHalalas) : null;
  const overdue = credit?.computed ? toHalalas(credit.overdueBaseHalalas) : null;

  return (
    <Card accent={available != null && available <= 0n ? theme.colors.negative : theme.colors.brand}>
      <View style={{ gap: theme.spacing.xs }}>
        <Text style={[textStyles.h4, { color: theme.colors.ink }]}>{customer.primaryName}</Text>
        <Text style={[textStyles.code, { color: theme.colors.ink3, fontSize: 12 }]}>{customer.customerNumber ?? '—'}</Text>
        {showCredit ? (
          credit?.computed ? (
            <View style={{ marginTop: theme.spacing.sm }}>
              <KeyValue label={t('sale.customer.creditLimit')} value={formatMoney(credit.limitBaseHalalas)} />
              <KeyValue
                label={t('sale.customer.creditAvailable')}
                value={formatMoney(credit.availableBaseHalalas)}
                color={available != null && available <= 0n ? theme.colors.negative : theme.colors.positive}
              />
              {overdue != null && overdue > 0n ? (
                <KeyValue label={t('sale.customer.overdue')} value={formatMoney(credit.overdueBaseHalalas)} color={theme.colors.critical} />
              ) : null}
            </View>
          ) : credit && !credit.computed ? (
            <Text style={[textStyles.caption, { color: theme.colors.ink3 }]}>{t('sale.customer.creditNone')}</Text>
          ) : creditFailed ? (
            <Text style={[textStyles.caption, { color: theme.colors.ink3 }]}>{t('sale.customer.creditUnavailable')}</Text>
          ) : null
        ) : null}
        {onChange ? (
          <AppButton label={t('sale.customer.change')} variant="ghost" onPress={onChange} style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }} />
        ) : null}
      </View>
    </Card>
  );
};
