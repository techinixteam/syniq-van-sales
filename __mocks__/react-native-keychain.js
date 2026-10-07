/**
 * Jest stand-in for the Android keystore (react-native-keychain is a native TurboModule). An
 * in-memory map with the three calls `src/api/token-store.ts` makes. A spec that needs a pre-filled
 * store declares its own `jest.mock('react-native-keychain', ...)`, which wins over this file.
 */
const store = {};
module.exports = {
  getGenericPassword: jest.fn(async ({ service }) =>
    store[service] ? { username: 'syniq', password: store[service], service } : false,
  ),
  setGenericPassword: jest.fn(async (_username, password, { service }) => {
    store[service] = password;
    return { service, storage: 'AES_GCM_NO_AUTH' };
  }),
  resetGenericPassword: jest.fn(async ({ service }) => {
    delete store[service];
    return true;
  }),
};
