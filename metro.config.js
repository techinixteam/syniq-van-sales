const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */

/**
 * Keep Metro's file watcher OUT of Android native build output.
 *
 * Without watchman (the normal case on Windows) Metro's FallbackWatcher opens one fs.watch handle per
 * directory. `run-android` starts Metro *before* Gradle, and the CMake/AGP build then deletes and
 * recreates thousands of directories under android/app/.cxx, android/app/build and
 * node_modules/<native-lib>/android/build. libuv (src/win/fs-event.c) reports a watched directory that
 * was deleted as an endless stream of `rename` events carrying the directory's own `\\?\` path, and the
 * FallbackWatcher never closes that handle — so Metro's main thread spins at 100% CPU and the bundle
 * sticks at ~97% forever. Not watching those directories removes the handles, and the bundle completes.
 *
 * The pattern is deliberately separator-agnostic: metro-file-map's watcher matches POSIX-converted
 * paths on Windows while the crawler/resolver test native paths. Metro's own default (`__tests__`)
 * is re-included here in the same form because it is replaced, not extended.
 */
const blockList = new RegExp(
  '(' +
    [
      // android/**/build, android/**/.cxx (the directory itself and everything below it), which also
      // covers node_modules/<native-lib>/android/{build,.cxx}
      '(^|[\\\\/])android[\\\\/](.*[\\\\/])?(build|\\.cxx)([\\\\/].*)?',
      // Gradle's own state directories (android/.gradle, node_modules/@react-native/gradle-plugin/.gradle)
      '(^|[\\\\/])\\.gradle([\\\\/].*)?',
      // Metro's default exclusion
      '[\\\\/]__tests__[\\\\/].*',
    ].join('|') +
    ')$',
);

const config = {
  resolver: {
    blockList,
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
