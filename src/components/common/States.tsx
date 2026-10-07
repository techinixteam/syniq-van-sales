import React from 'react';
import { ActivityIndicator, Text, View, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Inbox, Lock, TriangleAlert } from 'lucide-react-native';
import { AppButton } from '@/components/common/AppButton';
import { useTheme } from '@/contexts/ThemeContext';
import { textStyles } from '@/theme';
import { errorMessage, presentError } from '@/api/errors';

/**
 * The four states every screen in this app can be in, so that none of them invents its own.
 *
 * ⚠ THE 403 IS A SEPARATE STATE FROM THE ERROR, AND THAT IS THE POINT OF THIS FILE. The plan (§5.1)
 * requires it: the launchpad gates on `useHoldsPermission` — holds at ANY scope — so a user CAN
 * reach a screen they turn out not to hold at their own branch. Showing them a red "Something went
 * wrong" teaches them the app is broken. Telling them, once, in words, that this is not theirs to
 * do is the difference between a support ticket and an understood boundary.
 */

export const Loading: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  const theme = useTheme();
  return (
    <View style={[{ padding: theme.spacing.xxl, alignItems: 'center' }, style]}>
      <ActivityIndicator size="large" color={theme.colors.brand} />
    </View>
  );
};

export const EmptyState: React.FC<{ title: string; body?: string; style?: ViewStyle }> = ({
  title,
  body,
  style,
}) => {
  const theme = useTheme();
  return (
    <View style={[{ padding: theme.spacing.xl, alignItems: 'center', gap: theme.spacing.sm }, style]}>
      <Inbox size={40} color={theme.colors.ink3} />
      <Text style={[textStyles.h4, { color: theme.colors.ink, textAlign: 'center' }]}>{title}</Text>
      {body ? (
        <Text style={[textStyles.bodySmall, { color: theme.colors.ink2, textAlign: 'center' }]}>
          {body}
        </Text>
      ) : null}
    </View>
  );
};

/**
 * A refusal, not a failure.
 *
 * Rendered for a 403. No retry button: pressing it again will fail again, and offering one implies
 * the problem is transient when it is a permission.
 */
export const ForbiddenState: React.FC<{ detail?: string; style?: ViewStyle }> = ({
  detail,
  style,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <View style={[{ padding: theme.spacing.xl, alignItems: 'center', gap: theme.spacing.sm }, style]}>
      <Lock size={40} color={theme.colors.neutral} />
      <Text style={[textStyles.h4, { color: theme.colors.ink, textAlign: 'center' }]}>
        {t('error.forbiddenTitle')}
      </Text>
      <Text style={[textStyles.bodySmall, { color: theme.colors.ink2, textAlign: 'center' }]}>
        {detail ?? t('error.forbidden')}
      </Text>
    </View>
  );
};

/**
 * Anything else that went wrong, with a way back.
 *
 * Routes a 403 to `ForbiddenState` itself, so no caller has to remember to — the trap this exists
 * to close is a screen that catches every error the same way.
 */
export const ErrorState: React.FC<{
  error: unknown;
  onRetry?: () => void;
  style?: ViewStyle;
}> = ({ error, onRetry, style }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const presented = presentError(error);

  if (presented.forbidden) return <ForbiddenState detail={presented.detail} style={style} />;

  return (
    <View style={[{ padding: theme.spacing.xl, alignItems: 'center', gap: theme.spacing.md }, style]}>
      <TriangleAlert size={40} color={theme.colors.negative} />
      <Text style={[textStyles.body, { color: theme.colors.ink, textAlign: 'center' }]}>
        {errorMessage(error, t)}
      </Text>
      {presented.code ? (
        <Text style={[textStyles.caption, { color: theme.colors.ink3 }]}>{presented.code}</Text>
      ) : null}
      {onRetry ? <AppButton label={t('action.retry')} variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
};

/**
 * A non-blocking failure banner.
 *
 * For a refresh that failed while usable data is already on screen. Blanking a list because a
 * re-read timed out throws away information the user was reading; the banner says the figures may
 * be a minute old and lets them carry on.
 */
export const ErrorBanner: React.FC<{ error: unknown; onRetry?: () => void }> = ({
  error,
  onRetry,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        margin: theme.spacing.screenPadding,
        padding: theme.spacing.md,
        borderRadius: theme.radius.control,
        backgroundColor: theme.colors.negativeBg,
      }}
    >
      <TriangleAlert size={18} color={theme.colors.negative} />
      <Text style={[textStyles.bodySmall, { color: theme.colors.negative, flex: 1 }]}>
        {errorMessage(error, t)}
      </Text>
      {onRetry ? (
        <Text
          accessibilityRole="button"
          onPress={onRetry}
          style={[textStyles.label, { color: theme.colors.negative, textDecorationLine: 'underline' }]}
        >
          {t('action.retry')}
        </Text>
      ) : null}
    </View>
  );
};
