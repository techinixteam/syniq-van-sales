module.exports = {
  root: true,
  extends: '@react-native',
  rules: {
    /**
     * ⚠ OFF, AND NOT BECAUSE THE WARNINGS WERE ANNOYING.
     *
     * This app's colours come from a RUNTIME theme (`useTheme()` → light or dark, chosen per
     * device), so a coloured style physically cannot live in a module-scope `StyleSheet.create` —
     * there is no theme at module scope. Every screen therefore composes a static StyleSheet for
     * layout with an inline object for the themed parts, which is the shape the reference app uses
     * and the shape RN itself recommends for dynamic styles.
     *
     * Left on, the rule produced ~175 warnings across every screen in the app, including the
     * slice-0 primitives. A lint run nobody reads is worse than one rule fewer.
     */
    'react-native/no-inline-styles': 'off',

    /**
     * OFF for the same reason it exists: `void somePromise()` is how this codebase MARKS a promise
     * as deliberately not awaited (a fire-and-forget reload, a navigation after a post). The
     * alternative the rule pushes towards — `.catch(() => {})` or an ignored floating promise — is
     * either noise or the actual bug the marker exists to rule out.
     */
    'no-void': 'off',

    /**
     * The `_`-prefix convention, made real. It is used for a deliberately-discarded destructure
     * (`const { theme: _theme, ...rest }`) — the idiomatic way to omit a key — which is otherwise
     * reported as an unused variable with no way to say "yes, on purpose".
     */
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      },
    ],
  },
};
