import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react-native';
import { AppInput } from '@/components/common/AppInput';
import { searchCustomersApi, type CustomerHit } from '@/api/customer.api';
import { errorMessage } from '@/api/errors';
import { useTheme } from '@/contexts/ThemeContext';
import { useDebounced } from '@/hooks/useDebounced';
import { textStyles } from '@/theme';

/**
 * Typeahead over `GET /b2b-customers/search` — server-side, two characters minimum, twenty hits.
 * Never a full load: the customer book is planned for millions of rows.
 */
export const CustomerPicker: React.FC<{ companyId: string; onPick: (c: CustomerHit) => void; autoFocus?: boolean }> = ({
  companyId,
  onPick,
  autoFocus,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [q, setQ] = useState('');
  const term = useDebounced(q.trim(), 300);
  const [hits, setHits] = useState<CustomerHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (term.length < 2) {
      setHits([]);
      setError(null);
      return;
    }
    let cancelled = false;
    setBusy(true);
    searchCustomersApi(companyId, term)
      .then((rows) => {
        if (!cancelled) {
          setHits(rows);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e);
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, term]);

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <AppInput
        label={t('sale.customer.search')}
        placeholder={t('sale.customer.searchHint')}
        value={q}
        onChangeText={setQ}
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
      {busy ? <ActivityIndicator color={theme.colors.brand} /> : null}
      {error ? (
        <Text style={[textStyles.bodySmall, { color: theme.colors.negative }]}>{errorMessage(error, t)}</Text>
      ) : null}
      {!busy && !error && term.length >= 2 && hits.length === 0 ? (
        <Text style={[textStyles.bodySmall, { color: theme.colors.ink3 }]}>{t('sale.customer.none')}</Text>
      ) : null}
      {hits.map((c) => (
        <Pressable
          key={c.id}
          accessibilityRole="button"
          onPress={() => {
            setQ('');
            onPick(c);
          }}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.md,
            minHeight: theme.spacing.touchTarget,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
            borderRadius: theme.radius.control,
            borderWidth: 1,
            borderColor: theme.colors.line,
            backgroundColor: pressed ? theme.colors.surface2 : theme.colors.surface,
          })}
        >
          <Search size={16} color={theme.colors.ink3} />
          <View style={{ flex: 1 }}>
            <Text style={[textStyles.bodyStrong, { color: theme.colors.ink }]} numberOfLines={2}>
              {c.primaryName}
            </Text>
            <Text style={[textStyles.code, { color: theme.colors.ink3, fontSize: 12 }]}>{c.customerNumber ?? '—'}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
};
