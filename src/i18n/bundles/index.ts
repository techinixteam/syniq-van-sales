import { common } from '@/i18n/bundles/common';
import { errors } from '@/i18n/bundles/errors';
import { home } from '@/i18n/bundles/home';
import { profile } from '@/i18n/bundles/profile';
import { sale } from '@/i18n/bundles/sale';
import { stock } from '@/i18n/bundles/stock';

/**
 * Every bundle, composed HERE and nowhere else — pure data, so specs can read it without booting
 * i18next or React Native.
 *
 * ⚠ A NAMESPACE BELONGS TO EXACTLY ONE BUNDLE. These are spread into a single flat `translation`
 * resource, and in a spread a repeated top-level key silently WINS rather than conflicting —
 * `bundles.spec.ts` asserts the bundles' top-level keys are disjoint. It reads THIS object, so a
 * bundle added here is checked without anyone remembering to list it twice.
 */
export const BUNDLES = { common, errors, home, profile, sale, stock };
