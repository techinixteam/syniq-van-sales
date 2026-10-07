import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getMyQuotationsApi, type MyQuotationRow } from '@/api/van-sale.api';
import { Screen } from '@/components/common/Screen';
import { Card } from '@/components/common/Card';
import { StatusBadge } from '@/components/common/Badge';
import { HeaderButton } from '@/components/common/HeaderButton';
import { EmptyState, ErrorState } from '@/components/common/States';
import { useHoldsPermission } from '@/authz/usePermission';
import { useTheme } from '@/contexts/ThemeContext';
import { useReadyVan } from '@/contexts/VanContext';
import type { MainStackParamList } from '@/navigation/types';
import { textStyles } from '@/theme';
import { formatMoney } from '@/utils/money';

const PAGE_SIZE = 20;

/** The quotations THIS rep raised, newest first (`/o2c/van-sales/quotations`). */
export const QuotationListScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { companyId } = useReadyVan();
  const canCreate = useHoldsPermission('create', 'sales_quotation');
  const [rows, setRows] = useState<MyQuotationRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: canCreate ? () => <HeaderButton label={t('action.new')} onPress={() => navigation.navigate('NewQuotation')} /> : undefined,
    });
  }, [navigation, canCreate, t]);

  const load = useCallback(
    async (p: number, mode: 'first' | 'more' | 'refresh') => {
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      try {
        const res = await getMyQuotationsApi(companyId, p, PAGE_SIZE);
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
    [companyId],
  );

  // On first focus, and again on coming back from a new quotation — the list must show it.
  const loadedOnce = useRef(false);
  useFocusEffect(
    useCallback(() => {
      void load(1, loadedOnce.current ? 'refresh' : 'first');
      loadedOnce.current = true;
    }, [load]),
  );

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
        ListEmptyComponent={loading ? null : <EmptyState title={t('quote.listEmpty')} body={t('quote.listEmptyBody')} />}
        ListFooterComponent={loading ? <ActivityIndicator color={theme.colors.brand} style={{ margin: theme.spacing.lg }} /> : null}
        renderItem={({ item }) => (
          <Card onPress={() => navigation.navigate('QuotationDetail', { quotationId: item.id, code: item.code })}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: theme.spacing.sm }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[textStyles.code, { color: theme.colors.ink }]}>{item.code}</Text>
                <Text style={[textStyles.bodySmall, { color: theme.colors.ink2 }]} numberOfLines={1}>
                  {item.customerName ?? '—'}
                </Text>
                <Text style={[textStyles.caption, { color: theme.colors.ink3 }]}>
                  {t('quote.validUntil', { date: item.validTo.slice(0, 10) })}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={[textStyles.bodyStrong, { color: theme.colors.ink }]}>{formatMoney(item.grossHalalas, item.currency)}</Text>
                <StatusBadge status={item.effectiveStatus} label={t(`quote.status.${item.effectiveStatus}`)} />
              </View>
            </View>
          </Card>
        )}
      />
    </Screen>
  );
};
