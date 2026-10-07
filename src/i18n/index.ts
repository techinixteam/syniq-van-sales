import { I18nManager, NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { BUNDLES } from '@/i18n/bundles';

/**
 * i18n + RTL.
 *
 * ⚠ CHANGING LANGUAGE REQUIRES A RESTART, AND THAT IS NOT A SHORTCUT. React Native decides layout
 * direction natively, at view-construction time; `I18nManager.forceRTL` only takes effect on the
 * next process start. Flipping the i18next language alone re-translates the words and leaves every
 * row, icon and chevron mirrored the wrong way — a half-Arabic screen, which is worse than an
 * English one. `setLanguage` below therefore sets the flag, persists the choice, and asks the
 * caller to restart.
 *
 * ⚠ NUMERALS STAY WESTERN. `1234`, not `١٢٣٤` — matching syniq-web and the printed documents. An
 * article code or a GTIN that renders in Arabic-Indic digits cannot be compared by eye against the
 * label in the operator's hand, which is the entire job here.
 */

export const LANGUAGE_KEY = '@Syniq:language';

export type Language = 'en' | 'ar';

export { BUNDLES };

const resources = {
  en: {
    translation: Object.values(BUNDLES).reduce(
      (acc, b) => ({ ...acc, ...b.en }),
      {} as Record<string, unknown>,
    ),
  },
  ar: {
    translation: Object.values(BUNDLES).reduce(
      (acc, b) => ({ ...acc, ...b.ar }),
      {} as Record<string, unknown>,
    ),
  },
};

/** The device's language, used only until the user makes a choice. */
function deviceLanguage(): Language {
  const locale =
    Platform.OS === 'android'
      ? (NativeModules.I18nManager?.localeIdentifier as string | undefined)
      : undefined;
  return locale?.toLowerCase().startsWith('ar') ? 'ar' : 'en';
}

export async function initI18n(): Promise<Language> {
  let stored: Language | null = null;
  try {
    const v = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (v === 'en' || v === 'ar') stored = v;
  } catch {
    // A missing preference is not a launch failure.
  }

  const lng = stored ?? deviceLanguage();

  await i18n.use(initReactI18next).init({
    resources,
    lng,
    fallbackLng: 'en',
    // `ar: typeof en` already guarantees key parity at compile time, so a runtime miss means a
    // genuine bug rather than an untranslated string. Keep the fallback anyway — a blank label on
    // a warehouse screen helps nobody.
    interpolation: { escapeValue: false },
    returnNull: false,
  });

  // Align the native direction flag with the language we actually loaded. If they disagree the
  // process was started before a language change; the caller restarts.
  const shouldBeRTL = lng === 'ar';
  if (I18nManager.isRTL !== shouldBeRTL) {
    I18nManager.allowRTL(shouldBeRTL);
    I18nManager.forceRTL(shouldBeRTL);
  }

  return lng;
}

/**
 * Persist a language choice and set the native direction flag.
 *
 * Returns true when a RESTART IS REQUIRED for the layout to be correct — which is whenever the
 * direction changed. The caller must tell the user rather than leaving them on a mirrored screen.
 */
export async function setLanguage(lng: Language): Promise<boolean> {
  await AsyncStorage.setItem(LANGUAGE_KEY, lng);
  await i18n.changeLanguage(lng);

  const shouldBeRTL = lng === 'ar';
  const directionChanged = I18nManager.isRTL !== shouldBeRTL;
  if (directionChanged) {
    I18nManager.allowRTL(shouldBeRTL);
    I18nManager.forceRTL(shouldBeRTL);
  }
  return directionChanged;
}

export default i18n;
