import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { listVanInvoicesApi, type InvoiceRow } from '@/api/invoice.api';
import { Screen } from '@/components/common/Screen';
import { Card } from '@/components/common/Card';
import { StatusBadge } from '@/components/common/Badge';
import { EmptyState, ErrorState } from '@/components/common/States';
import { useTheme } from '@/contexts/ThemeContext';
import { useReadyVan } from '@/contexts/VanContext';
import type { MainStackParamList } from '@/navigation/types';
import { textStyles } from '@/theme';
import { formatMoney } from '@/utils/money';

const PAGE_SIZE = 25;

/** The tax invoices sold from THIS van, newest first — paged, pull to refresh. */
export const InvoiceListScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { companyId, van } = useReadyVan();
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(
    async (p: number, mode: 'first' | 'more' | 'refresh') => {
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      try {
        const res = await listVanInvoicesApi(companyId, van.id, p, PAGE_SIZE);
        setRows((prev) => (p === 1 ? res.items : [...prev, ...res.items]));
        setPage(res.page);
        setPageCount(res.pageCount ?? Math.max(1, Math.ceil(res.total / PAGE_SIZE)));
        setError(null);
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [companyId, van.id],
  );

  useEffect(() => {
    void load(1, 'first');
  }, [load]);

  if (error && rows.length === 0) return <Screen><ErrorState error={error} onRetry={() => void load(1, 'first')} /></Screen>;

  return (
    <Screen>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: theme.spacing.screenPadding, gap: theme.spacing.sm }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(1, 'refresh')} />}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (!loading && page < pageCount) void load(page + 1, 'more');
        }}
        ListEmptyComponent={loading ? null : <EmptyState title={t('invoice.listEmpty')} body={t('invoice.listEmptyBody', { van: van.code })} />}
        ListFooterComponent={loading ? <ActivityIndicator color={theme.colors.brand} style={{ margin: theme.spacing.lg }} /> : null}
        renderItem={({ item }) => (
          <Card onPress={() => navigation.navigate('InvoiceDetail', { invoiceId: item.id, docNumber: item.docNumber })}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: theme.spacing.sm }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[textStyles.code, { color: theme.colors.ink }]}>{item.docNumber}</Text>
                <Text style={[textStyles.bodySmall, { color: theme.colors.ink2 }]} numberOfLines={1}>
                  {item.buyerPartySnapshot?.registrationName ?? '—'}
                </Text>
                <Text style={[textStyles.caption, { color: theme.colors.ink3 }]}>{item.invoiceDate.slice(0, 10)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={[textStyles.bodyStrong, { color: theme.colors.ink }]}>{formatMoney(item.grossHalalas, item.currency)}</Text>
                <StatusBadge status={item.status} label={t(`invoice.status.${item.status}`, { defaultValue: item.status })} />
              </View>
            </View>
          </Card>
        )}
      />
    </Screen>
  );
};
