import { keyboardEvents } from './useKeyboardVisible';

/**
 * The pair, per platform. A hook cannot be run without a renderer in this suite, but the one thing
 * about it that is easy to get wrong is pure: WHICH pair of keyboard events to subscribe to.
 *
 * Android never emits `keyboardWillShow`, so a listener on the iOS pair alone leaves the handheld —
 * the only device this app ships on — thinking the keyboard is never up. Subscribing to both pairs
 * "to be safe" double-fires on iOS instead.
 */
describe('keyboardEvents', () => {
  it('uses the did* pair on Android — the will* events are never emitted there', () => {
    expect(keyboardEvents('android')).toEqual({
      show: 'keyboardDidShow',
      hide: 'keyboardDidHide',
    });
  });

  it('uses the will* pair on iOS, so the bar goes before the keyboard animates in', () => {
    expect(keyboardEvents('ios')).toEqual({
      show: 'keyboardWillShow',
      hide: 'keyboardWillHide',
    });
  });

  it('falls back to did* on anything else', () => {
    expect(keyboardEvents('windows').show).toBe('keyboardDidShow');
  });
});
