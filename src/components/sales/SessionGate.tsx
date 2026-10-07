import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Truck } from 'lucide-react-native';
import { AppButton } from '@/components/common/AppButton';
import { errorMessage } from '@/api/errors';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { VanSessionStatus } from '@/contexts/VanContext';
import { textStyles } from '@/theme';

/**
 * What the rep sees when the app cannot start selling — one state, one sentence, one person to ask.
 * See VanContext for why each state is named separately.
 */
export const SessionGate: React.FC<{ status: Exclude<VanSessionStatus, 'ready'>; error: unknown; onRetry: () => void }> = ({
  status,
  error,
  onRetry,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { logout } = useAuth();

  if (status === 'loading') {
    return (
      <View style={{ padding: theme.spacing.xxl, alignItems: 'center', gap: theme.spacing.md }}>
        <ActivityIndicator size="large" color={theme.colors.brand} />
        <Text style={[textStyles.bodySmall, { color: theme.colors.ink2 }]}>{t('home.gate.loading')}</Text>
      </View>
    );
  }

  const body = status === 'error' ? errorMessage(error, t) : t(`home.gate.${status}Body`);
  return (
    <View style={{ padding: theme.spacing.xl, alignItems: 'center', gap: theme.spacing.md }}>
      <Truck size={44} color={theme.colors.ink3} />
      <Text style={[textStyles.h3, { color: theme.colors.ink, textAlign: 'center' }]}>{t(`home.gate.${status}`)}</Text>
      <Text style={[textStyles.body, { color: theme.colors.ink2, textAlign: 'center' }]}>{body}</Text>
      <View style={{ alignSelf: 'stretch', gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
        <AppButton label={t('action.retry')} variant="secondary" onPress={onRetry} />
        <AppButton label={t('action.signOut')} variant="ghost" onPress={() => void logout()} />
      </View>
    </View>
  );
};
