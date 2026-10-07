/** Jest stand-in for react-native-blob-util (native). Specs that exercise downloads mock it themselves. */
module.exports = {
  __esModule: true,
  default: {
    fs: {
      dirs: { CacheDir: '/cache' },
      exists: jest.fn(async () => false),
      isDir: jest.fn(async () => true),
      mkdir: jest.fn(async () => {}),
      unlink: jest.fn(async () => {}),
      readFile: jest.fn(async () => ''),
      mv: jest.fn(async () => {}),
    },
    config: jest.fn(() => ({ fetch: jest.fn() })),
    android: { actionViewIntent: jest.fn(async () => true) },
  },
};
