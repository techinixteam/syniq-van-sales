import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/common/Screen';
import { AppButton } from '@/components/common/AppButton';
import { AppInput } from '@/components/common/AppInput';
import { SyniqLogo } from '@/components/brand/SyniqLogo';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ApiError } from '@/api/apiClient';
import { textStyles } from '@/theme';

/**
 * Sign in with an employee code or an email.
 *
 * `POST /auth/login` matches `username OR email` (`local-password.provider.ts:48`), and the
 * username IS the employee code, so one field serves both — no "sign in with…" chooser.
 */
export const LoginScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { login, isSigningIn } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = useCallback(async () => {
    setError(null);
    try {
      await login(identifier.trim(), password);
    } catch (e) {
      setError(messageFor(e, t));
    }
  }, [login, identifier, password, t]);

  const canSubmit = identifier.trim().length > 0 && password.length > 0 && !isSigningIn;
  // The 4" MC2200 with its keyboard up has ~280 dp for this whole form: the mark gives way first.
  const compact = theme.layout === 'compact';

  return (
    <Screen>
      <KeyboardAvoidingView behavior="padding" style={styles.fill}>
        <View style={[styles.body, { padding: theme.spacing.screenPadding, gap: theme.spacing.lg }]}>
          {/*
            The lockup, not a text heading. This is the first screen anyone sees and the only place
            in the app with room for the full mark — everywhere else gets the bare mark in a header.
            `stacked` is the official vertical lockup for hero surfaces, per syniq-web's component.
          */}
          <View
            style={{
              alignItems: 'center',
              marginBottom: compact ? theme.spacing.lg : theme.spacing.xxl,
            }}
          >
            <SyniqLogo orientation="stacked" markHeight={compact ? 44 : 64} />
            <Text
              style={[
                textStyles.label,
                { color: theme.colors.ink3, marginTop: theme.spacing.md, letterSpacing: 1 },
              ]}
            >
              {t('app.tagline')}
            </Text>
          </View>

          <AppInput
            label={t('field.identifier')}
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            autoCorrect={false}
            // A handheld keyboard that autocorrects an employee code is a support ticket.
            spellCheck={false}
            returnKeyType="next"
          />

          <AppInput
            label={t('field.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            // A masked field on a shared handheld with a wedge keyboard is where typos hide.
            secureToggle
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={canSubmit ? onSubmit : undefined}
          />

          {error ? (
            <Text
              accessibilityRole="alert"
              style={[textStyles.bodySmall, { color: theme.colors.negative }]}
            >
              {error}
            </Text>
          ) : null}

          <AppButton
            label={isSigningIn ? t('status.signingIn') : t('action.signIn')}
            onPress={onSubmit}
            disabled={!canSubmit}
            loading={isSigningIn}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
};

/**
 * Map a failure to something an operator can act on.
 *
 * ⚠ Branch on `status` / `code`, never on the message text — see `ApiError`. And note the 429: at
 * shift start a whole branch shares one public IP against a 10-per-60s throttle, so "wrong
 * password" would be a lie told to ten people whose passwords are right.
 */
function messageFor(e: unknown, t: (k: string) => string): string {
  if (e instanceof ApiError) {
    if (e.status === 429) return t('error.tooManyAttempts');
    if (e.status === 401) return t('error.badCredentials');
    if (e.status >= 500) return t('error.serverDown');
    return e.message || t('error.generic');
  }
  // Not an ApiError ⇒ no response was received at all: timeout or no connection.
  return t('error.offline');
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  body: { flex: 1, justifyContent: 'center' },
});
