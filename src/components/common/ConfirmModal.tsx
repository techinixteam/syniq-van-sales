import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppButton } from '@/components/common/AppButton';
import { useTheme } from '@/contexts/ThemeContext';
import { textStyles } from '@/theme';

/**
 * The gate in front of anything irreversible.
 *
 * ⚠ NOT `Alert.alert`. A React Native `Alert` is a native dialog whose buttons are OS-sized and
 * OS-ordered, which on a handheld means a 32dp confirm button next to a 32dp cancel, in whatever
 * order the platform likes, in whatever language the DEVICE is set to — not the language the
 * operator chose in this app. Everything this dialog guards posts to a ledger.
 *
 * The destructive action is on the RIGHT and is the only filled button, matching the rest of the
 * app; the cancel is full-size, because a 6am mis-tap on the wrong one of these posts a receipt.
 */
export const ConfirmModal: React.FC<{
  visible: boolean;
  title: string;
  body: string;
  /** The affirmative label. Say what will HAPPEN ("Post receipt"), never "OK". */
  confirmLabel: string;
  cancelLabel?: string;
  /**
   * A NOTICE rather than a question — "Prices are live" — has one way out. The cancel button is
   * dropped; scrim tap and the back gesture still call `onCancel`, so pass the same closer twice.
   */
  notice?: boolean;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel,
  notice = false,
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      // Android's back gesture must cancel, not confirm. Without this the dialog is dismissed by
      // the OS with no callback at all and the caller is left holding a `busy` state forever.
      onRequestClose={busy ? undefined : onCancel}
    >
      <Pressable
        style={styles.scrim}
        // Tapping the scrim cancels — but never while the post is in flight, when a stray touch
        // would hide a dialog whose request is still running.
        onPress={busy ? undefined : onCancel}
      >
        <Pressable
          // Swallows the press so a tap INSIDE the sheet does not reach the scrim above.
          onPress={() => {}}
          style={[
            styles.sheet,
            theme.shadows.pop,
            {
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radius.tile,
              padding: theme.spacing.lg,
              gap: theme.spacing.md,
            },
          ]}
        >
          <Text style={[textStyles.h3, { color: theme.colors.ink }]}>{title}</Text>
          <Text style={[textStyles.body, { color: theme.colors.ink2 }]}>{body}</Text>

          <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
            <AppButton
              label={confirmLabel}
              variant={destructive ? 'destructive' : 'primary'}
              loading={busy}
              onPress={onConfirm}
            />
            {notice ? null : (
              <AppButton
                label={cancelLabel ?? t('action.cancel')}
                variant="secondary"
                disabled={busy}
                onPress={onCancel}
              />
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  sheet: { width: '100%' },
});
