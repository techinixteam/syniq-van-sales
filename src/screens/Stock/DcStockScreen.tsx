import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getDcSitesApi, getDcStockApi, type DcStockRow, type QtyInPacks } from '@/api/dc-stock.api';
import type { SiteRef } from '@/api/types';
import { Screen } from '@/components/common/Screen';
import { Card } from '@/components/common/Card';
import { AppInput } from '@/components/common/AppInput';
import { EmptyState, ErrorState, Loading } from '@/components/common/States';
import { useTheme } from '@/contexts/ThemeContext';
import { useAsync } from '@/hooks/useAsync';
import { useDebounced } from '@/hooks/useDebounced';
import { textStyles } from '@/theme';
import { formatQty } from '@/utils/qty';

const PAGE_SIZE = 50;

/** "10 CS · 3 EA" — the server's own breakdown; the bare base figure when there is none. */
export const packsLabel = (q: QtyInPacks, base: string | null): string =>
  q.breakdown.length > 0 ? q.breakdown.map((p) => `${formatQty(p.qty)} ${p.uomCode}`).join(' · ') : `${formatQty(q.base)} ${base ?? ''}`.trim();

/**
 * What the distribution centre holds — quantities only, in packs. The DC is chosen automatically
 * when there is one (the usual case); with several, a chip row picks it.
 */
export const DcStockScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const sites = useAsync(getDcSitesApi);
  const [site, setSite] = useState<SiteRef | null>(null);
  const [q, setQ] = useState('');
  const term = useDebounced(q.trim(), 350);
  const [rows, setRows] = useState<DcStockRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const ar = i18n.language === 'ar';

  useEffect(() => {
    if (!site && sites.data && sites.data.length > 0) setSite(sites.data[0]!);
  }, [sites.data, site]);

  const load = useCallback(
    async (p: number) => {
      if (!site) return;
      setLoading(true);
      try {
        const res = await getDcStockApi(site.id, term || undefined, p, PAGE_SIZE);
        setRows((prev) => (p === 1 ? res.items : [...prev, ...res.items]));
        setPage(res.page);
        setPageCount(res.pageCount ?? Math.max(1, Math.ceil(res.total / PAGE_SIZE)));
        setError(null);
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    },
    [site, term],
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  if (sites.loading && !sites.data) return <Screen><Loading /></Screen>;
  if (sites.error) return <Screen><ErrorState error={sites.error} onRetry={sites.reload} /></Screen>;
  if (sites.data && sites.data.length === 0) return <Screen><EmptyState title={t('dcStock.noDc')} body={t('dcStock.noDcBody')} /></Screen>;

  return (
    <Screen>
      <View style={{ padding: theme.spacing.screenPadding, paddingBottom: 0, gap: theme.spacing.sm }}>
        {(sites.data?.length ?? 0) > 1 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
            {sites.data!.map((s) => {
              const selected = s.id === site?.id;
              return (
                <Pressable
                  key={s.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setSite(s)}
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
                    {s.code} · {ar ? s.nameAr || s.nameEn : s.nameEn}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : site ? (
          <Text style={[textStyles.bodySmall, { color: theme.colors.ink2 }]}>
            {site.code} · {ar ? site.nameAr || site.nameEn : site.nameEn}
          </Text>
        ) : null}
        <AppInput value={q} onChangeText={setQ} placeholder={t('dcStock.search')} autoCapitalize="none" autoCorrect={false} returnKeyType="search" />
      </View>
      {error && rows.length === 0 ? (
        <ErrorState error={error} onRetry={() => void load(1)} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.articleId}
          contentContainerStyle={{ padding: theme.spacing.screenPadding, gap: theme.spacing.sm }}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (!loading && page < pageCount) void load(page + 1);
          }}
          ListEmptyComponent={loading ? null : <EmptyState title={term ? t('dcStock.noMatch') : t('dcStock.empty')} />}
          ListFooterComponent={loading ? <ActivityIndicator color={theme.colors.brand} style={{ margin: theme.spacing.lg }} /> : null}
          renderItem={({ item }) => (
            <Card>
              <Text style={[textStyles.bodyStrong, { color: theme.colors.ink }]} numberOfLines={2}>
                {item.article?.primaryName ?? item.articleId}
              </Text>
              <Text style={[textStyles.code, { color: theme.colors.ink3, fontSize: 12 }]}>
                {[item.article?.articleNumber, item.article?.barcode].filter(Boolean).join(' · ')}
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: theme.spacing.xs }}>
                <Text style={[textStyles.caption, { color: theme.colors.ink2 }]}>{t('dcStock.available')}</Text>
                <Text style={[textStyles.bodyStrong, { color: theme.colors.ink }]}>{packsLabel(item.available, item.baseUomCode)}</Text>
              </View>
            </Card>
          )}
        />
      )}
    </Screen>
  );
};
