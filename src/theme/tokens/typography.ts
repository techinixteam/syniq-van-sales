/**
 * Typography — hand-authored, and deliberately one step larger than both the web and the
 * reference app (plan §4.4).
 *
 * syniq-web's body is 14px, read at desk distance on a 24" monitor. loadindo-vendor's is also 14,
 * read at phone distance by someone standing still. This app's reader is at arm's length in an
 * aisle, in gloves, under warehouse lighting, reading an article code they must get right. Body is
 * **16**, and the smallest text that ever carries meaning is 13.
 *
 * The font is the platform's own. No custom face is bundled: a handheld's Arabic rendering is the
 * one thing the OS is reliably better at than a webfont, and RTL shaping is not worth risking to
 * match a heading weight.
 */
export const typography = {
  fontFamily: {
    /** `undefined` = platform default (Roboto on Android, and the system Arabic face for `ar`). */
    primary: undefined as string | undefined,
    /** Tabular-ish face for codes, quantities and barcodes, where digit alignment aids scanning. */
    mono: 'monospace',
  },

  fontSize: {
    h1: 26,
    h2: 22,
    h3: 19,
    h4: 17,

    body: 16,
    bodySmall: 14,

    /** The floor. Below this, nothing that a user must read. */
    small: 13,
    tiny: 12,

    /** Scanned quantities and totals — read across a bay, not held to the face. */
    display: 34,
  },

  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },

  lineHeight: {
    tight: 18,
    normal: 22,
    relaxed: 24,
    loose: 28,
    extraLoose: 34,
    display: 40,
  },
} as const;

export type Typography = typeof typography;

/**
 * Ready-made combinations. Screens use these rather than assembling size + weight + leading by
 * hand, so a heading is the same heading everywhere.
 *
 * ⚠ No `letterSpacing`. Negative tracking is a Latin-display refinement that damages Arabic
 * shaping, and this app renders both from the same style objects.
 */
export const textStyles = {
  h1: {
    fontSize: typography.fontSize.h1,
    fontWeight: typography.fontWeight.bold,
    lineHeight: typography.lineHeight.extraLoose,
  },
  h2: {
    fontSize: typography.fontSize.h2,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.lineHeight.loose,
  },
  h3: {
    fontSize: typography.fontSize.h3,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.lineHeight.relaxed,
  },
  h4: {
    fontSize: typography.fontSize.h4,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.lineHeight.normal,
  },

  body: {
    fontSize: typography.fontSize.body,
    fontWeight: typography.fontWeight.regular,
    lineHeight: typography.lineHeight.normal,
  },
  bodyStrong: {
    fontSize: typography.fontSize.body,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.lineHeight.normal,
  },
  bodySmall: {
    fontSize: typography.fontSize.bodySmall,
    fontWeight: typography.fontWeight.regular,
    lineHeight: typography.lineHeight.tight,
  },

  /** Section headings on the launchpad — matches web's uppercase tracking-wider ink-2 rule. */
  sectionLabel: {
    fontSize: typography.fontSize.small,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.lineHeight.tight,
    textTransform: 'uppercase' as const,
  },

  label: {
    fontSize: typography.fontSize.small,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.lineHeight.tight,
  },
  caption: {
    fontSize: typography.fontSize.tiny,
    fontWeight: typography.fontWeight.regular,
    lineHeight: typography.lineHeight.tight,
  },

  button: {
    fontSize: typography.fontSize.h4,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.lineHeight.normal,
  },

  /** Article codes, GTINs, quantities. Monospaced so a transposed digit is visible. */
  code: {
    fontFamily: typography.fontFamily.mono,
    fontSize: typography.fontSize.body,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.lineHeight.normal,
  },
  display: {
    fontSize: typography.fontSize.display,
    fontWeight: typography.fontWeight.bold,
    lineHeight: typography.lineHeight.display,
  },
} as const;
