import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Appearance, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { NetworkStatusProvider } from '@/contexts/NetworkStatusContext';
import { RootNavigator } from '@/navigation/RootNavigator';
import { initI18n } from '@/i18n';

/**
 * ⚠ i18n MUST finish before the tree mounts. `initI18n` reads the stored language and sets the
 * native RTL flag; a tree mounted before it resolves renders left-to-right and then cannot be
 * corrected without a restart. Hence the gate below rather than a `Suspense` boundary.
 */
const App: React.FC = () => {
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    initI18n().finally(() => setI18nReady(true));
  }, []);

  if (!i18nReady) {
    /**
     * ⚠ THE BACKGROUND COLOUR HERE IS LOAD-BEARING. This view previously had none, so it rendered
     * transparent over the native window — which on a night-mode device is near-black — and its
     * spinner carried no colour either, leaving a default grey invisible on black. The result was a
     * screen that looked like a crash while the app was in fact working perfectly.
     *
     * The colours are read from `Appearance` rather than from `useTheme`, because this renders
     * BEFORE ThemeProvider mounts. They must match `syniq_canvas` / `syniq_logo` in the native
     * `values/colors.xml` and `values-night/colors.xml` — those are what the launch window paints,
     * and picking the light pair on a night-mode device would replace a black screen with a white
     * flash, which is not an improvement.
     */
    const dark = Appearance.getColorScheme() === 'dark';
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: dark ? '#1a1c20' : '#f8fafc',
        }}
      >
        <ActivityIndicator size="large" color={dark ? '#2f86d8' : '#0a66b3'} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <NetworkStatusProvider>
            <AuthProvider>
              <RootNavigator />
            </AuthProvider>
          </NetworkStatusProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
