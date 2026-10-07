import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getVanStockApi } from '@/api/van-sale.api';
import { Screen } from '@/components/common/Screen';
import { Card } from '@/components/common/Card';
import { AppInput } from '@/components/common/AppInput';
import { EmptyState, ErrorState, Loading } from '@/components/common/States';
import { useTheme } from '@/contexts/ThemeContext';
import { useReadyVan } from '@/contexts/VanContext';
import { useFocusAsync } from '@/hooks/useAsync';
import { textStyles } from '@/theme';
import { formatQty } from '@/utils/qty';
import { vanStockRows } from '@/utils/van-stock';

/**
 * What is on the van right now — QUANTITIES ONLY, in each article's base unit, batches summed.
 * The route also carries the branch's average cost; a rep sells at the customer's price, so the
 * cost of the van is not shown here.
 */
export const VanStockScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { van } = useReadyVan();
  const [q, setQ] = useState('');
  const loader = useCallback(() => getVanStockApi(van.id, van.siteId), [van.id, van.siteId]);
  const { data, loading, error, reload } = useFocusAsync(loader);
  const ar = i18n.language === 'ar';

  const rows = useMemo(() => vanStockRows(data?.lines ?? [], q, ar), [data, q, ar]);

  if (loading && !data) return <Screen><Loading /></Screen>;
  if (error && !data) return <Screen><ErrorState error={error} onRetry={reload} /></Screen>;

  return (
    <Screen>
      <View style={{ padding: theme.spacing.screenPadding, paddingBottom: 0, gap: theme.spacing.xs }}>
        <Text style={[textStyles.bodySmall, { color: theme.colors.ink2 }]}>
          {t('vanStock.summary', { van: van.code, count: rows.length })}
        </Text>
        <AppInput value={q} onChangeText={setQ} placeholder={t('vanStock.filter')} autoCapitalize="none" autoCorrect={false} />
      </View>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.articleId}
        contentContainerStyle={{ padding: theme.spacing.screenPadding, gap: theme.spacing.sm }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
        ListEmptyComponent={<EmptyState title={q ? t('vanStock.noMatch') : t('vanStock.empty')} body={q ? undefined : t('vanStock.emptyBody')} />}
        renderItem={({ item }) => (
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[textStyles.bodyStrong, { color: theme.colors.ink }]} numberOfLines={2}>{item.name}</Text>
                <Text style={[textStyles.code, { color: theme.colors.ink3, fontSize: 12 }]}>{item.articleNumber ?? '—'}</Text>
              </View>
              <Text style={[textStyles.code, { color: theme.colors.ink, fontSize: 18 }]}>
                {formatQty(item.qty)}
                <Text style={textStyles.caption}> {item.uom ?? ''}</Text>
              </Text>
            </View>
          </Card>
        )}
      />
    </Screen>
  );
};
