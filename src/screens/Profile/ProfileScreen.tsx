import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react-native';
import { Screen } from '@/components/common/Screen';
import { Card, Section } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { KeyValue } from '@/components/common/KeyValue';
import { AppButton } from '@/components/common/AppButton';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { ENV } from '@/config/env';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme, useThemeControls, type ThemePreference } from '@/contexts/ThemeContext';
import { useVan } from '@/contexts/VanContext';
import { roleLabel } from '@/screens/Profile/profile-roles';
import { setLanguage, type Language } from '@/i18n';
import { textStyles } from '@/theme';
import { version as appVersion } from '../../../package.json';

/** Who is signed in, which van and salesperson they sell as, and the device's settings. */
export const ProfileScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { preference, setPreference } = useThemeControls();
  const { me, logout } = useAuth();
  const { van, vans, salespeople, selectVan } = useVan();
  const [signOutOpen, setSignOutOpen] = useState(false);
  const ar = i18n.language === 'ar';

  const onLanguage = useCallback(
    async (lng: Language) => {
      const restartNeeded = await setLanguage(lng);
      if (restartNeeded) Alert.alert(t('profile.restartRequired'), t('profile.restartRequiredBody'));
    },
    [t],
  );

  return (
    <Screen>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: theme.spacing.screenPadding, gap: theme.spacing.lg }}>
        <Section title={t('profile.account')}>
          <Card>
            <KeyValue label={t('profile.name')} value={(ar ? me?.user.name?.ar : me?.user.name?.en) || me?.user.username} />
            <KeyValue label={t('profile.username')} value={me?.user.username} mono />
            <KeyValue label={t('profile.email')} value={me?.user.email} />
            <KeyValue
              label={t('profile.branch')}
              value={me?.homeSite ? `${me.homeSite.code} · ${ar ? me.homeSite.nameAr || me.homeSite.nameEn : me.homeSite.nameEn}` : t('profile.noBranch')}
            />
          </Card>
        </Section>

        <Section title={t('profile.roles')}>
          <Card>
            {me && me.roles.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {me.roles.map((r) => (
                  <Badge key={r.id} label={roleLabel(r, i18n.language)} tone="info" />
                ))}
              </View>
            ) : (
              <Text style={[textStyles.body, { color: theme.colors.ink2 }]}>{t('profile.noRoles')}</Text>
            )}
          </Card>
        </Section>

        <Section title={t('profile.van')}>
          <Card>
            {salespeople.map((s) => (
              <KeyValue key={s.id} label={t('profile.salesperson')} value={`${s.code} · ${ar ? s.nameAr || s.nameEn : s.nameEn}`} />
            ))}
            {vans.length === 0 ? (
              <Text style={[textStyles.body, { color: theme.colors.ink2 }]}>{t('profile.noVan')}</Text>
            ) : (
              <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
                {vans.map((v) => (
                  <Choice
                    key={v.id}
                    label={`${v.code} · ${ar ? v.nameAr || v.nameEn : v.nameEn}${v.plateNo ? ` — ${v.plateNo}` : ''}`}
                    selected={v.id === van?.id}
                    onPress={vans.length > 1 ? () => selectVan(v.id) : undefined}
                  />
                ))}
              </View>
            )}
          </Card>
        </Section>

        <Section title={t('profile.language')}>
          <Card>
            <View style={{ gap: theme.spacing.sm }}>
              <Choice label={t('profile.english')} selected={i18n.language === 'en'} onPress={() => void onLanguage('en')} />
              <Choice label={t('profile.arabic')} selected={i18n.language === 'ar'} onPress={() => void onLanguage('ar')} />
            </View>
          </Card>
        </Section>

        <Section title={t('profile.theme')}>
          <Card>
            <View style={{ gap: theme.spacing.sm }}>
              {(
                [
                  ['system', t('profile.themeSystem')],
                  ['light', t('profile.themeLight')],
                  ['dark', t('profile.themeDark')],
                ] as Array<[ThemePreference, string]>
              ).map(([key, label]) => (
                <Choice key={key} label={label} selected={preference === key} onPress={() => setPreference(key)} />
              ))}
            </View>
          </Card>
        </Section>

        <Section title={t('profile.about')}>
          <Card>
            <KeyValue label={t('profile.version')} value={appVersion} mono />
            <KeyValue label={t('profile.server')} value={ENV.API_BASE_URL} mono />
          </Card>
        </Section>

        <AppButton label={t('action.signOut')} variant="destructive" onPress={() => setSignOutOpen(true)} />
      </ScrollView>

      <ConfirmModal
        visible={signOutOpen}
        title={t('profile.signOutConfirm')}
        body={t('profile.signOutConfirmBody')}
        confirmLabel={t('action.signOut')}
        destructive
        onConfirm={() => {
          setSignOutOpen(false);
          void logout();
        }}
        onCancel={() => setSignOutOpen(false)}
      />
    </Screen>
  );
};

const Choice: React.FC<{ label: string; selected: boolean; onPress?: () => void }> = ({ label, selected, onPress }) => {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        minHeight: theme.spacing.touchTarget,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.radius.control,
        borderWidth: 1,
        borderColor: selected ? theme.colors.brand : theme.colors.line,
        backgroundColor: selected ? theme.colors.brandSubtle : pressed ? theme.colors.surface2 : 'transparent',
      })}
    >
      <Text style={[textStyles.body, { color: theme.colors.ink, flex: 1 }]}>{label}</Text>
      {selected ? <Check size={18} color={theme.colors.brand} /> : null}
    </Pressable>
  );
};
