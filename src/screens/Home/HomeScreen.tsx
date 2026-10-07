import React, { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Boxes,
  ClipboardList,
  FilePlus2,
  FileText,
  ReceiptText,
  Truck,
  UserRound,
  Warehouse,
  type LucideIcon,
} from 'lucide-react-native';
import { Screen } from '@/components/common/Screen';
import { Launchpad, type LaunchpadSection } from '@/components/common/Launchpad';
import { Badge } from '@/components/common/Badge';
import { Card } from '@/components/common/Card';
import { SessionGate } from '@/components/sales/SessionGate';
import { usePermissionSet } from '@/authz/permission-store';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useVan } from '@/contexts/VanContext';
import { HOME_SECTIONS } from '@/screens/Home/tiles';
import type { MainStackParamList } from '@/navigation/types';
import { textStyles } from '@/theme';

const ICONS: Record<string, LucideIcon> = {
  'new-invoice': FilePlus2,
  invoices: ReceiptText,
  'new-quotation': FileText,
  quotations: ClipboardList,
  'van-stock': Truck,
  'dc-stock': Warehouse,
};

/**
 * Home: who is selling, from which van, and the six things a rep does. Until the van session is
 * ready (company, salesperson link, van), the SessionGate says exactly what is missing instead.
 */
export const HomeScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { me } = useAuth();
  const session = useVan();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const permissionSet = usePermissionSet();
  const ar = i18n.language === 'ar';

  const sections = useMemo<LaunchpadSection[]>(() => {
    const held = new Set((permissionSet ?? []).map((p) => p.permission));
    return HOME_SECTIONS.map((s) => ({
      title: t(s.titleKey),
      tiles: s.tiles.map((tile) => ({
        key: tile.key,
        label: t(tile.labelKey),
        description: t(`${tile.labelKey}Hint`),
        icon: ICONS[tile.key] ?? Boxes,
        show: held.has(tile.permission),
        onPress: () => navigation.navigate(tile.route as never),
      })),
    }));
  }, [permissionSet, t, navigation]);

  const name = (ar ? me?.user.name?.ar : me?.user.name?.en) || me?.user.name?.en || me?.user.username || t('app.name');
  const van = session.van;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.xxl }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md, paddingHorizontal: theme.spacing.screenPadding, paddingTop: theme.spacing.lg }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[textStyles.h2, { color: theme.colors.ink }]}>{name}</Text>
            <Text style={[textStyles.bodySmall, { color: theme.colors.ink2 }]}>{t('app.name')}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('profile.title')}
            onPress={() => navigation.navigate('Profile')}
            style={({ pressed }) => ({
              width: theme.spacing.touchTarget,
              height: theme.spacing.touchTarget,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: theme.radius.control,
              borderWidth: 1,
              borderColor: theme.colors.line,
              backgroundColor: pressed ? theme.colors.surface3 : theme.colors.surface,
            })}
          >
            <UserRound size={22} color={theme.colors.ink2} />
          </Pressable>
        </View>

        {session.status !== 'ready' || !van ? (
          <SessionGate status={session.status === 'ready' ? 'loading' : session.status} error={session.error} onRetry={session.reload} />
        ) : (
          <>
            <Card style={{ marginHorizontal: theme.spacing.screenPadding, marginTop: theme.spacing.lg }} accent={van.status === 'ACTIVE' ? theme.colors.positive : theme.colors.negative}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                <Truck size={28} color={theme.colors.brand} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[textStyles.h4, { color: theme.colors.ink }]}>
                    {van.code} · {ar ? van.nameAr || van.nameEn : van.nameEn}
                  </Text>
                  <Text style={[textStyles.caption, { color: theme.colors.ink2 }]}>
                    {[van.plateNo, van.site ? `${van.site.code} · ${ar ? van.site.nameAr || van.site.nameEn : van.site.nameEn}` : null].filter(Boolean).join(' — ')}
                  </Text>
                </View>
                {van.status !== 'ACTIVE' ? <Badge label={t('home.vanInactive')} tone="negative" /> : null}
              </View>
            </Card>
            <Launchpad sections={sections} />
          </>
        )}
      </ScrollView>
    </Screen>
  );
};
