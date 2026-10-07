import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check, Plus, X } from 'lucide-react-native';
import { searchArticlesApi, type ArticleSearchHit } from '@/api/article.api';
import { errorMessage } from '@/api/errors';
import { AppInput } from '@/components/common/AppInput';
import { useTheme } from '@/contexts/ThemeContext';
import { useDebounced } from '@/hooks/useDebounced';
import { textStyles } from '@/theme';
import { formatQty, fromScaled } from '@/utils/qty';

/**
 * Find an article and put it in the basket — by name, by article number, or by barcode (typed, or
 * from a keyboard-wedge / Bluetooth scanner, which types into the same box).
 *
 * The sheet STAYS OPEN after a pick: an order is several items, and closing after each would make
 * the rep reopen it eight times. Each pick is ticked, and a second tap on the same item adds one more.
 */
export const ArticleSearchSheet: React.FC<{
  visible: boolean;
  onClose: () => void;
  onPick: (hit: ArticleSearchHit) => void;
  /** What the van holds, per article, in base units ×10⁴ — shown beside each hit when known. */
  vanStock?: ReadonlyMap<string, bigint> | null;
  /** How many of each article is already in the basket — for the tick. */
  inBasket: ReadonlyMap<string, number>;
}> = ({ visible, onClose, onPick, vanStock, inBasket }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [q, setQ] = useState('');
  const term = useDebounced(q.trim(), 300);
  const [hits, setHits] = useState<ArticleSearchHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (visible) setQ('');
  }, [visible]);

  useEffect(() => {
    if (term.length < 2) {
      setHits([]);
      setError(null);
      return;
    }
    let cancelled = false;
    setBusy(true);
    searchArticlesApi(term, 25)
      .then((rows) => {
        if (cancelled) return;
        // A sale needs a sellable article: ACTIVE, or DISCONTINUED (being run down — exactly the
        // stock a van is often clearing). DRAFT / IN_REVIEW / BLOCKED / ARCHIVED cannot be sold.
        setHits(rows.filter((r) => r.status === 'ACTIVE' || r.status === 'DISCONTINUED'));
        setError(null);
      })
      .catch((e: unknown) => !cancelled && setError(e))
      .finally(() => !cancelled && setBusy(false));
    return () => {
      cancelled = true;
    };
  }, [term]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.fill, { backgroundColor: theme.colors.canvas }]}>
        <View style={[styles.head, { padding: theme.spacing.lg, borderBottomColor: theme.colors.line, backgroundColor: theme.colors.surface }]}>
          <Text style={[textStyles.h3, { color: theme.colors.ink, flex: 1 }]}>{t('sale.lines.addTitle')}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={t('action.done')} onPress={onClose} hitSlop={12}>
            <X size={24} color={theme.colors.ink2} />
          </Pressable>
        </View>
        <View style={{ padding: theme.spacing.lg, gap: theme.spacing.sm }}>
          <AppInput
            value={q}
            onChangeText={setQ}
            placeholder={t('sale.lines.searchHint')}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {busy ? <ActivityIndicator color={theme.colors.brand} /> : null}
          {error ? <Text style={[textStyles.bodySmall, { color: theme.colors.negative }]}>{errorMessage(error, t)}</Text> : null}
          {!busy && !error && term.length >= 2 && hits.length === 0 ? (
            <Text style={[textStyles.bodySmall, { color: theme.colors.ink3 }]}>{t('sale.lines.noMatch')}</Text>
          ) : null}
          {term.length < 2 ? <Text style={[textStyles.caption, { color: theme.colors.ink3 }]}>{t('sale.lines.typeTwo')}</Text> : null}
        </View>
        <FlatList
          data={hits}
          keyExtractor={(h) => h.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xxl, gap: theme.spacing.sm }}
          renderItem={({ item }) => {
            const count = inBasket.get(item.id) ?? 0;
            const onVan = vanStock ? vanStock.get(item.id) ?? 0n : null;
            return (
              <Pressable
                accessibilityRole="button"
                onPress={() => onPick(item)}
                style={({ pressed }) => [
                  styles.row,
                  {
                    gap: theme.spacing.md,
                    padding: theme.spacing.md,
                    borderRadius: theme.radius.control,
                    borderWidth: 1,
                    borderColor: count > 0 ? theme.colors.brand : theme.colors.line,
                    backgroundColor: pressed ? theme.colors.surface2 : theme.colors.surface,
                  },
                ]}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[textStyles.bodyStrong, { color: theme.colors.ink }]} numberOfLines={2}>
                    {item.primaryName}
                  </Text>
                  <Text style={[textStyles.code, { color: theme.colors.ink3, fontSize: 12 }]}>
                    {[item.articleNumber, item.barcode].filter(Boolean).join(' · ')}
                  </Text>
                  {onVan != null ? (
                    <Text style={[textStyles.caption, { color: onVan > 0n ? theme.colors.positive : theme.colors.negative }]}>
                      {t('sale.lines.onVan', { qty: formatQty(fromScaled(onVan)) })}
                    </Text>
                  ) : null}
                </View>
                {count > 0 ? (
                  <View style={[styles.row, { gap: 4 }]}>
                    <Check size={18} color={theme.colors.brand} />
                    <Text style={[textStyles.label, { color: theme.colors.brand }]}>{count}</Text>
                  </View>
                ) : (
                  <Plus size={22} color={theme.colors.brand} />
                )}
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center' },
});
