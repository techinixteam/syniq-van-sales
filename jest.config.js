/**
 * The reference app (loadindo-vendor) ships without tests. This one keeps them, because the
 * load-bearing logic here is pure and cheap to get wrong, and none of it needs a device:
 *
 *   · `utils/barcode.ts`      the `99` price-embedded label rule (plan §6.3)
 *   · `utils/scan-resolve.ts` the exact-GTIN-first ladder and the refusal-not-guess rule
 *   · `utils/qty.ts`          exact decimal arithmetic — no float ever touches a quantity
 *   · `utils/po.ts`           the base-vs-purchase unit trap on an open PO line
 *   · `authz/scope.ts`        the GLOBAL-default trap (plan §5.2)
 *   · `screens/**\/*.spec.ts` the guards: blind counting, the tile map, the transfer action matrix
 */
module.exports = {
  // RN 0.85 no longer ships the bare `react-native` preset alias — it lives in its own package.
  preset: '@react-native/jest-preset',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['<rootDir>/src/**/*.(spec|test).(ts|tsx)'],
  // ⚠ EVERY ENTRY HERE SHIPS ESM AND MUST BE TRANSFORMED. `@react-native-async-storage` and
  // `react-native-safe-area-context` were added when the first spec reached the api layer and the
  // component tree: without them Jest reads `import { … }` in `node_modules` and fails with
  // "Cannot use import statement outside a module", which reads as a broken test rather than a
  // missing transform. Add to this list, do not mock around it.
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|@react-navigation|lucide-react-native|@react-native-async-storage|react-native-safe-area-context)/)',
  ],
};
