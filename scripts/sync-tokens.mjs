#!/usr/bin/env node
/**
 * sync-tokens — generate the RN colour + radius tokens FROM syniq-web's stylesheet.
 *
 *   node scripts/sync-tokens.mjs           rewrite the generated files
 *   node scripts/sync-tokens.mjs --check   fail (exit 1) if they are stale
 *
 * WHY THIS EXISTS. The plan's promise (§4.4) is that this app looks like syniq-web. Hand-copied
 * hex satisfies that on the day it is typed and never again — the web ships a palette tweak, and
 * the handheld quietly becomes a different product. So the palette is GENERATED from the single
 * source of truth, and `tokens:check` runs in CI. It is the same drift-guard shape this estate
 * already uses for `contracts:check` (syniq-server) and `mirror:check` (syniq-store-node).
 *
 * WHAT IS DELIBERATELY NOT PORTED.
 *   • `--color-glass-*`, `--glass-*`, `--ambient-*` — these are `backdrop-filter` and gradient
 *     tokens with no React Native equivalent. Launchpad tiles render as flat `surface` cards
 *     (plan §4.4). They are skipped by the hex filter below rather than by a name list, because a
 *     new glass token added upstream should also be skipped without anyone remembering to.
 *   • `--shadow-*` — a CSS box-shadow does not render on Android without an `elevation` twin, so
 *     shadows are hand-authored in `tokens/shadows.ts` and are NOT generated.
 *   • Spacing and typography — the web has no portable spacing scale, and this app's type ramp is
 *     deliberately larger (arm's-length use, gloves). Both are hand-authored.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const SOURCE = resolve(REPO, '..', 'syniq-web', 'src', 'styles', 'globals.css');
const OUT_DIR = join(REPO, 'src', 'theme', 'tokens');

const check = process.argv.includes('--check');

// ── Read the source of truth ────────────────────────────────────────────────────────────────────

if (!existsSync(SOURCE)) {
  console.error(
    `[tokens] syniq-web stylesheet not found at:\n  ${SOURCE}\n\n` +
      'This repo generates its palette from the sibling syniq-web checkout. Clone it beside this\n' +
      'one, or run with the checkout present. The generated files under src/theme/tokens/ are\n' +
      'committed, so a build that only compiles does not need it — only tokens:sync/check do.',
  );
  process.exit(1);
}

const css = readFileSync(SOURCE, 'utf8');

/**
 * Pull one brace-delimited block by its opening line. Brace-counting rather than a lazy regex,
 * because these blocks contain nested `rgb(... / ...)` and comment braces that a `[^}]*` would
 * terminate on early.
 */
function block(openerRe) {
  const m = openerRe.exec(css);
  if (!m) return null;
  let depth = 0;
  let i = css.indexOf('{', m.index);
  const start = i + 1;
  for (; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) return css.slice(start, i);
  }
  return null;
}

// `@theme {` — NOT `@theme inline {`, which is a shadcn bridge block of var() indirections.
const lightBlock = block(/@theme\s*\{/);
const darkBlock = block(/:root\[data-theme=['"]dark['"]\]\s*\{/);

if (!lightBlock) {
  console.error('[tokens] could not find the `@theme { … }` block in globals.css.');
  process.exit(1);
}
if (!darkBlock) {
  console.error("[tokens] could not find the `:root[data-theme='dark'] { … }` block.");
  process.exit(1);
}

// ── Parse ───────────────────────────────────────────────────────────────────────────────────────

/** `--color-surface-2` → `surface2`, `--color-on-brand` → `onBrand`. */
const camel = (name) =>
  name
    .replace(/^--(color|radius)-/, '')
    .replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());

/** Only 3/6/8-digit hex survives. This is what excludes every glass/ambient `rgb(… / …)` token. */
const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

function colorsFrom(text) {
  const out = {};
  for (const [, name, value] of text.matchAll(/(--color-[\w-]+)\s*:\s*([^;]+);/g)) {
    const v = value.trim();
    if (HEX.test(v)) out[camel(name)] = v.toLowerCase();
  }
  return out;
}

function radiiFrom(text) {
  const out = {};
  for (const [, name, value] of text.matchAll(/(--radius-[\w-]+)\s*:\s*([^;]+);/g)) {
    const v = value.trim();
    const rem = /^([\d.]+)rem$/.exec(v);
    const px = /^([\d.]+)px$/.exec(v);
    if (rem) out[camel(name)] = Math.round(parseFloat(rem[1]) * 16);
    else if (px) out[camel(name)] = Math.round(parseFloat(px[1]));
  }
  return out;
}

const light = colorsFrom(lightBlock);
const darkOverrides = colorsFrom(darkBlock);
const radii = radiiFrom(lightBlock);

// Dark is light with the overrides applied — NOT the override set alone. This is what guarantees
// both palettes carry identical keys, which is in turn what lets `ColorPalette` be one type and
// `createTheme('dark')` be total. A dark palette missing a key would be a runtime `undefined`
// colour on exactly the screens nobody tests in dark.
const dark = { ...light, ...darkOverrides };

const orphans = Object.keys(darkOverrides).filter((k) => !(k in light));
if (orphans.length) {
  console.error(
    `[tokens] the dark block defines ${orphans.length} token(s) the light block does not: ` +
      `${orphans.join(', ')}.\nThat is upstream drift in globals.css, not a bug here — fix it there.`,
  );
  process.exit(1);
}

if (Object.keys(light).length < 20) {
  console.error(`[tokens] only parsed ${Object.keys(light).length} colours — the source shape changed.`);
  process.exit(1);
}

// ── Emit ────────────────────────────────────────────────────────────────────────────────────────

const BANNER = (what) => `/**
 * ${what}
 *
 * ⚠ GENERATED FILE — DO NOT EDIT.
 * Source:    syniq-web/src/styles/globals.css
 * Generator: scripts/sync-tokens.mjs   (\`npm run tokens:sync\`)
 * Guard:     \`npm run tokens:check\` fails the build when this drifts from the web.
 *
 * Glass, ambient and shadow tokens are intentionally absent — see the generator's docblock.
 */
`;

const entries = (o) =>
  Object.entries(o)
    .map(([k, v]) => `  ${k}: ${typeof v === 'number' ? v : `'${v}'`},`)
    .join('\n');

const lightFile = `${BANNER('Light palette — the default theme.')}
export const lightColors = {
${entries(light)}
} as const;

/** The palette shape. Both themes carry identical keys, by construction in the generator. */
export type ColorPalette = Record<keyof typeof lightColors, string>;
`;

const darkFile = `${BANNER('Dark palette — light, with the web’s data-theme=‘dark’ overrides applied.')}
import type { ColorPalette } from './colors.light';

export const darkColors: ColorPalette = {
${entries(dark)}
};
`;

const radiusFile = `${BANNER('Corner radii — theme-independent. rem converted to points at 16px/rem.')}
export const radius = {
${entries(radii)}
} as const;

export type Radius = typeof radius;
`;

const files = [
  ['colors.light.ts', lightFile],
  ['colors.dark.ts', darkFile],
  ['radius.ts', radiusFile],
];

let stale = [];
for (const [name, content] of files) {
  const path = join(OUT_DIR, name);
  const current = existsSync(path) ? readFileSync(path, 'utf8') : null;
  if (current === content) continue;
  if (check) stale.push(name);
  else writeFileSync(path, content, 'utf8');
}

if (check) {
  if (stale.length) {
    console.error(
      `[tokens] STALE — ${stale.join(', ')} no longer match syniq-web.\n` +
        'Run `npm run tokens:sync` and commit the result.',
    );
    process.exit(1);
  }
  console.log(
    `[tokens] ok — ${Object.keys(light).length} colours, ${Object.keys(radii).length} radii in sync with syniq-web.`,
  );
} else {
  console.log(
    `[tokens] wrote ${files.length} files — ${Object.keys(light).length} colours ` +
      `(${Object.keys(darkOverrides).length} dark overrides), ${Object.keys(radii).length} radii.`,
  );
}
