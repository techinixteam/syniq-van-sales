/**
 * Light palette — the default theme.
 *
 * ⚠ GENERATED FILE — DO NOT EDIT.
 * Source:    syniq-web/src/styles/globals.css
 * Generator: scripts/sync-tokens.mjs   (`npm run tokens:sync`)
 * Guard:     `npm run tokens:check` fails the build when this drifts from the web.
 *
 * Glass, ambient and shadow tokens are intentionally absent — see the generator's docblock.
 */

export const lightColors = {
  brand: '#2563eb',
  brandHover: '#1d4ed8',
  brandActive: '#1e40af',
  brandSubtle: '#eff6ff',
  shell: '#0f172a',
  shellHover: '#1e293b',
  shellActive: '#020617',
  shellLine: '#334155',
  canvas: '#f8fafc',
  surface: '#ffffff',
  surface2: '#f8fafc',
  surface3: '#f1f5f9',
  line: '#e2e8f0',
  lineSubtle: '#f1f5f9',
  lineStrong: '#cbd5e1',
  field: '#cbd5e1',
  ink: '#0f172a',
  ink2: '#475569',
  ink3: '#94a3b8',
  positive: '#107e3e',
  positiveBg: '#ebf5eb',
  critical: '#e9730c',
  criticalBg: '#fef7f1',
  negative: '#bb0000',
  negativeBg: '#ffebeb',
  info: '#0a6ed1',
  infoBg: '#eaf3fc',
  neutral: '#6a6d70',
  neutralBg: '#eaecee',
  onBrand: '#ffffff',
  onPositive: '#ffffff',
  onNegative: '#ffffff',
  logo: '#0a66b3',
  logoHover: '#08579a',
  logoActive: '#074a83',
  logoDeep: '#063b6a',
  logoMid: '#0a66b3',
  logoBright: '#1470bd',
  logoSubtle: '#e8f1fa',
  logoAccent: '#9fd2ff',
  onLogo: '#ffffff',
} as const;

/** The palette shape. Both themes carry identical keys, by construction in the generator. */
export type ColorPalette = Record<keyof typeof lightColors, string>;
