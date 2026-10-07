import React from 'react';
import { ActivityIndicator, StatusBar, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { VanProvider, useVan } from '@/contexts/VanContext';
import { navigationRef } from '@/navigation/navigationRef';
import type { MainStackParamList, RootStackParamList } from '@/navigation/types';
import { LoginScreen } from '@/screens/Auth/LoginScreen';
import { HomeScreen } from '@/screens/Home/HomeScreen';
import { ProfileScreen } from '@/screens/Profile/ProfileScreen';
import { NewInvoiceScreen, NewQuotationScreen } from '@/screens/Sale/NewDocumentScreen';
import { InvoiceDoneScreen } from '@/screens/Invoices/InvoiceDoneScreen';
import { InvoiceListScreen } from '@/screens/Invoices/InvoiceListScreen';
import { InvoiceDetailScreen } from '@/screens/Invoices/InvoiceDetailScreen';
import { QuotationListScreen } from '@/screens/Quotations/QuotationListScreen';
import { QuotationDetailScreen } from '@/screens/Quotations/QuotationDetailScreen';
import { VanStockScreen } from '@/screens/Stock/VanStockScreen';
import { DcStockScreen } from '@/screens/Stock/DcStockScreen';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();

const Loading: React.FC = () => {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.canvas }}>
      <ActivityIndicator size="large" color={theme.colors.brand} />
    </View>
  );
};

/**
 * ⚠ THE SELLING SCREENS EXIST ONLY ONCE THE VAN SESSION IS READY. They read the company and the
 * van through `useReadyVan`, which throws without them — so until VanContext says `ready`, the
 * stack holds Home (which shows WHY it is not ready) and Profile (to sign out or switch language),
 * and nothing that could post to a company the app has not resolved.
 */
const MainNavigator: React.FC = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const { status } = useVan();
  const ready = status === 'ready';

  return (
    <MainStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.ink,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.colors.canvas },
      }}
    >
      <MainStack.Screen name="Home" component={HomeScreen} options={{ headerShown: false, title: t('app.name') }} />
      <MainStack.Screen name="Profile" component={ProfileScreen} options={{ title: t('profile.title') }} />
      {ready ? (
        <>
          <MainStack.Screen name="NewInvoice" component={NewInvoiceScreen} options={{ title: t('invoice.newTitle') }} />
          <MainStack.Screen name="InvoiceDone" component={InvoiceDoneScreen} options={{ title: t('invoice.doneTitle'), headerBackVisible: false, gestureEnabled: false }} />
          <MainStack.Screen name="Invoices" component={InvoiceListScreen} options={{ title: t('invoice.listTitle') }} />
          <MainStack.Screen
            name="InvoiceDetail"
            component={InvoiceDetailScreen}
            options={({ route }) => ({ title: route.params.docNumber ?? t('invoice.detailTitle') })}
          />
          <MainStack.Screen name="NewQuotation" component={NewQuotationScreen} options={{ title: t('quote.newTitle') }} />
          <MainStack.Screen name="Quotations" component={QuotationListScreen} options={{ title: t('quote.listTitle') }} />
          <MainStack.Screen
            name="QuotationDetail"
            component={QuotationDetailScreen}
            options={({ route }) => ({ title: route.params.code ?? t('quote.detailTitle') })}
          />
          <MainStack.Screen name="VanStock" component={VanStockScreen} options={{ title: t('vanStock.title') }} />
          <MainStack.Screen name="DcStock" component={DcStockScreen} options={{ title: t('dcStock.title') }} />
        </>
      ) : null}
    </MainStack.Navigator>
  );
};

export const RootNavigator: React.FC = () => {
  const { isAuthenticated, ready } = useAuth();
  const theme = useTheme();

  return (
    <>
      <StatusBar barStyle={theme.isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.canvas} />
      <NavigationContainer ref={navigationRef}>
        {!ready ? (
          <Loading />
        ) : (
          <RootStack.Navigator screenOptions={{ headerShown: false }}>
            {isAuthenticated ? (
              <RootStack.Screen name="Main">
                {() => (
                  <VanProvider>
                    <MainNavigator />
                  </VanProvider>
                )}
              </RootStack.Screen>
            ) : (
              <RootStack.Screen name="Login" component={LoginScreen} />
            )}
          </RootStack.Navigator>
        )}
      </NavigationContainer>
    </>
  );
};
