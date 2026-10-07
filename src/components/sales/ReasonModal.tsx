import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppButton } from '@/components/common/AppButton';
import { AppInput } from '@/components/common/AppInput';
import { useTheme } from '@/contexts/ThemeContext';
import { textStyles } from '@/theme';

/**
 * Ask for a REPRINT reason. The server refuses a second print of a tax invoice without one (3–240
 * characters) and records it on the print log — so the field is required, not decorative.
 */
export const ReasonModal: React.FC<{
  visible: boolean;
  busy?: boolean;
  onSubmit: (reason: string) => void;
  onCancel: () => void;
}> = ({ visible, busy = false, onSubmit, onCancel }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (visible) setReason('');
  }, [visible]);

  const ok = reason.trim().length >= 3;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={busy ? undefined : onCancel}>
      <Pressable style={styles.scrim} onPress={busy ? undefined : onCancel}>
        <Pressable
          onPress={() => {}}
          style={[theme.shadows.pop, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.tile, padding: theme.spacing.lg, gap: theme.spacing.md }]}
        >
          <Text style={[textStyles.h3, { color: theme.colors.ink }]}>{t('invoice.reprint.title')}</Text>
          <Text style={[textStyles.body, { color: theme.colors.ink2 }]}>{t('invoice.reprint.body')}</Text>
          <AppInput value={reason} onChangeText={setReason} placeholder={t('invoice.reprint.placeholder')} maxLength={240} autoFocus />
          <View style={{ gap: theme.spacing.sm }}>
            <AppButton label={t('invoice.reprint.confirm')} onPress={() => onSubmit(reason.trim())} disabled={!ok} loading={busy} />
            <AppButton label={t('action.cancel')} variant="secondary" onPress={onCancel} disabled={busy} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'center', padding: 20 },
});
