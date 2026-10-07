const path = require('path');

module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: [path.resolve('./src')],
        extensions: ['.android.ts', '.ts', '.tsx', '.android.js', '.js', '.jsx', '.json'],
        alias: {
          '@/api': path.resolve('./src/api'),
          '@/authz': path.resolve('./src/authz'),
          '@/components': path.resolve('./src/components'),
          '@/config': path.resolve('./src/config'),
          '@/contexts': path.resolve('./src/contexts'),
          '@/hooks': path.resolve('./src/hooks'),
          '@/i18n': path.resolve('./src/i18n'),
          '@/native': path.resolve('./src/native'),
          '@/navigation': path.resolve('./src/navigation'),
          '@/screens': path.resolve('./src/screens'),
          '@/services': path.resolve('./src/services'),
          '@/theme': path.resolve('./src/theme'),
          '@/types': path.resolve('./src/types'),
          '@/utils': path.resolve('./src/utils'),
        },
      },
    ],
    // Must stay LAST — react-native-reanimated v4 delegates its worklet transform to this
    // plugin, and it rewrites nodes the other plugins must have finished with.
    'react-native-worklets/plugin',
  ],
};
