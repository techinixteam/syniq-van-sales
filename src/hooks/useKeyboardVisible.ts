import { useEffect, useState } from 'react';
import { Keyboard, Platform, type KeyboardEventName } from 'react-native';

/**
 * Is the soft keyboard up?
 *
 * The handheld's window is `adjustResize` (see AndroidManifest), so an open keyboard SHRINKS the
 * screen rather than covering it — a bar pinned to the bottom of the layout ends up floating
 * directly above the keys, over the line the operator is typing into. Screens that pin one use
 * this to take it away for the duration.
 *
 * ⚠ THE EVENT PAIR IS PER PLATFORM, NOT BOTH PAIRS EVERYWHERE. iOS emits `keyboardWill*` ahead of
 * the animation; Android emits `keyboardDid*` only. Subscribing to all four would fire twice on
 * iOS and read as a flicker, so `keyboardEvents` picks the pair the platform actually sends.
 */
export function keyboardEvents(os: typeof Platform.OS): {
  show: KeyboardEventName;
  hide: KeyboardEventName;
} {
  return os === 'ios'
    ? { show: 'keyboardWillShow', hide: 'keyboardWillHide' }
    : { show: 'keyboardDidShow', hide: 'keyboardDidHide' };
}

export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const events = keyboardEvents(Platform.OS);
    const show = Keyboard.addListener(events.show, () => setVisible(true));
    const hide = Keyboard.addListener(events.hide, () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return visible;
}
