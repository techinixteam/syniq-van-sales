import { Platform, type ViewStyle } from 'react-native';

/**
 * Elevation — hand-authored, NOT generated.
 *
 * syniq-web's `--shadow-*` are CSS box-shadows, and a box-shadow does not render on Android at
 * all: RN maps shadows there through the `elevation` prop, which takes a single number and paints
 * a Material shadow the app does not get to shape. So each step below states BOTH — the iOS-shaped
 * fields (harmless, and correct if this app ever grows an iOS target) and the Android elevation
 * that actually does the work today.
 *
 * The ramp mirrors the web's four steps by intent rather than by value: shell < card < cardHover
 * < pop.
 */

const make = (elevation: number, radius: number, opacity: number, offsetY: number): ViewStyle =>
  Platform.select<ViewStyle>({
    android: { elevation },
    default: {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: radius,
    },
  })!;

export const shadows = {
  /** Flat. Explicit, so a component can turn elevation OFF without a conditional style. */
  none: Platform.select<ViewStyle>({ android: { elevation: 0 }, default: {} })!,

  /** App bar / sticky header. */
  shell: make(2, 2, 0.05, 1),

  /** The default card and launchpad tile. */
  card: make(3, 3, 0.06, 1),

  /** A pressed or focused tile. */
  cardHover: make(6, 12, 0.1, 4),

  /** Sheets, dialogs, toasts. */
  pop: make(12, 30, 0.22, 10),
} as const;

export type Shadows = typeof shadows;
