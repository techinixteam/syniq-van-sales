import React from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react-native';
import { AppInput } from '@/components/common/AppInput';
import { Loading } from '@/components/common/States';
import { useTheme } from '@/contexts/ThemeContext';
import { textStyles } from '@/theme';

/**
 * A bottom sheet that picks one thing from a list.
 *
 * Used for the acting-branch picker, the destination branch, the unit, the vehicle and the driver
 * — every place a screen needs one value out of a set that is too long for a row of chips.
 *
 * ⚠ EVERY ROW IS AT LEAST `touchTarget` TALL. A picker is where a mis-tap is most likely and most
 * expensive: choosing the wrong destination branch on a transfer sends stock to the wrong city.
 */
export interface SheetOption {
  key: string;
  label: string;
  /** A second line — a code, a plate, an expiry. Shown small and monospaced. */
  detail?: string;
  /**
   * Further lines for anything compared DIGIT BY DIGIT — GTINs, a plate, an account number. One
   * line each, and ALL of them: a row that summarises ("+2") hides the very digits the reader came
   * to match.
   *
   * Separate from `detail` because these are set in the mono face: a barcode read off a carton is
   * checked character by character, and a proportional face hides a transposition.
   */
  codes?: string[];
}

export function ChoiceSheet<T extends SheetOption>({
  visible,
  title,
  options,
  loading = false,
  selectedKey,
  searchable = false,
  searchPlaceholder,
  onSelect,
  onClose,
  emptyLabel,
}: {
  visible: boolean;
  title: string;
  options: T[];
  loading?: boolean;
  selectedKey?: string | null;
  searchable?: boolean;
  searchPlaceholder?: string;
  onSelect: (option: T) => void;
  onClose: () => void;
  emptyLabel?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [query, setQuery] = React.useState('');

  // Reset the filter each time the sheet opens. A remembered search term is a list that looks
  // empty for reasons the user cannot see.
  React.useEffect(() => {
    if (visible) setQuery('');
  }, [visible]);

  const needle = query.trim().toLowerCase();
  const shown = needle
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(needle) ||
          (o.detail ? o.detail.toLowerCase().includes(needle) : false) ||
          (o.codes ? o.codes.some((c) => c.toLowerCase().includes(needle)) : false),
      )
    : options;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable
          onPress={() => {}}
          style={[
            styles.sheet,
            theme.shadows.pop,
            {
              backgroundColor: theme.colors.surface,
              borderTopLeftRadius: theme.radius.tile,
              borderTopRightRadius: theme.radius.tile,
            },
          ]}
        >
          <View style={[styles.head, { padding: theme.spacing.lg, borderBottomColor: theme.colors.line }]}>
            <Text style={[textStyles.h3, { color: theme.colors.ink, flex: 1 }]}>{title}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('action.close')}
              onPress={onClose}
              hitSlop={12}
            >
              <X size={24} color={theme.colors.ink2} />
            </Pressable>
          </View>

          {searchable ? (
            <View style={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.sm }}>
              <AppInput
                value={query}
                onChangeText={setQuery}
                placeholder={searchPlaceholder ?? t('action.search')}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          ) : null}

          {loading ? (
            <Loading />
          ) : (
            <FlatList
              data={shown}
              keyExtractor={(o) => o.key}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text
                  style={[
                    textStyles.body,
                    { color: theme.colors.ink3, padding: theme.spacing.xl, textAlign: 'center' },
                  ]}
                >
                  {emptyLabel ?? t('list.empty')}
                </Text>
              }
              renderItem={({ item }) => {
                const selected = item.key === selectedKey;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => onSelect(item)}
                    style={({ pressed }) => [
                      styles.option,
                      {
                        minHeight: theme.spacing.touchTarget,
                        paddingHorizontal: theme.spacing.lg,
                        borderBottomColor: theme.colors.lineSubtle,
                        backgroundColor: selected
                          ? theme.colors.brandSubtle
                          : pressed
                            ? theme.colors.surface2
                            : 'transparent',
                      },
                    ]}
                  >
                    <Text style={[textStyles.body, { color: theme.colors.ink }]}>{item.label}</Text>
                    {item.detail ? (
                      <Text style={[textStyles.caption, { color: theme.colors.ink2 }]}>
                        {item.detail}
                      </Text>
                    ) : null}
                    {item.codes?.map((code) => (
                      <Text key={code} style={[textStyles.code, { color: theme.colors.ink3, fontSize: 12 }]}>
                        {code}
                      </Text>
                    ))}
                  </Pressable>
                );
              }}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  // Capped so the sheet never becomes a full-screen page with a scrim above it.
  sheet: { maxHeight: '80%' },
  head: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  option: { justifyContent: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
});
