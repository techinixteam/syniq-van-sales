#!/usr/bin/env node
/**
 * sync-brand — generate the SyniQ mark FROM syniq-web's traced artwork.
 *
 *   node scripts/sync-brand.mjs           rewrite the generated files
 *   node scripts/sync-brand.mjs --check   fail (exit 1) if they are stale
 *
 * Same argument as `sync-tokens.mjs`: the logo has ONE source of truth
 * (`syniq-web/src/shared/ui/brand/syniq-logo-paths.ts`, traced from the official artwork at
 * 2400px), and a hand-copied path string is correct only on the day it is pasted.
 *
 * Two outputs, from the one source:
 *
 *   src/components/brand/logo-paths.ts               for `react-native-svg` (login, headers)
 *   android/app/src/main/res/drawable/ic_syniq_mark.xml   an Android VectorDrawable
 *
 * ⚠ NO RASTERISER, DELIBERATELY. syniq-web's `gen-favicon.mjs` needs a Playwright Chromium to
 * produce PNGs; an Android VectorDrawable takes the SAME path data as SVG, so the launcher icon
 * and the splash can be vector all the way down with no binary build step and no extra dependency.
 * The only conversions needed are `fill-rule: evenodd` → `android:fillType="evenOdd"` and an
 * explicit viewport.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const SOURCE = resolve(
  REPO, '..', 'syniq-web', 'src', 'shared', 'ui', 'brand', 'syniq-logo-paths.ts',
);

const check = process.argv.includes('--check');

if (!existsSync(SOURCE)) {
  console.error(
    `[brand] SyniQ artwork not found at:\n  ${SOURCE}\n\n` +
      'Generated outputs are committed, so an ordinary build does not need the sibling checkout —\n' +
      'only brand:sync/check do.',
  );
  process.exit(1);
}

const src = readFileSync(SOURCE, 'utf8');

/** Pull `export const NAME = '…';` — the paths are single-quoted single-line strings. */
function constant(name) {
  const m = new RegExp(`export const ${name}\\s*=\\s*\\n?\\s*'([^']+)'`).exec(src);
  if (!m) {
    console.error(`[brand] could not read ${name} from the artwork file — its shape changed.`);
    process.exit(1);
  }
  return m[1];
}

const MARK_VIEWBOX = constant('MARK_VIEWBOX');
const MARK_PATH = constant('MARK_PATH');
const WORDMARK_VIEWBOX = constant('WORDMARK_VIEWBOX');
const WORDMARK_PATH = constant('WORDMARK_PATH');

const [, , markW, markH] = MARK_VIEWBOX.split(/\s+/).map(Number);

// ── Output 1: the RN paths ──────────────────────────────────────────────────────────────────────

const tsFile = `/**
 * SyniQ brand paths.
 *
 * ⚠ GENERATED FILE — DO NOT EDIT.
 * Source:    syniq-web/src/shared/ui/brand/syniq-logo-paths.ts (traced from the official artwork)
 * Generator: scripts/sync-brand.mjs   (\`npm run brand:sync\`)
 * Guard:     \`npm run brand:check\` fails the build when this drifts from the web.
 */

export const MARK_VIEWBOX = '${MARK_VIEWBOX}';
export const MARK_PATH =
  '${MARK_PATH}';

export const WORDMARK_VIEWBOX = '${WORDMARK_VIEWBOX}';
export const WORDMARK_PATH =
  '${WORDMARK_PATH}';
`;

// ── Output 2: the Android VectorDrawable ────────────────────────────────────────────────────────
//
// `android:fillType="evenOdd"` is not optional: both paths are single COMPOUND paths whose
// counters (the holes in the mark) only render as holes under the even-odd rule. Default
// non-zero winding fills them solid and the logo becomes a blob.

const vectorFile = `<?xml version="1.0" encoding="utf-8"?>
<!--
  GENERATED — DO NOT EDIT.  Source: syniq-web/.../syniq-logo-paths.ts
  Generator: scripts/sync-brand.mjs   ·   Guard: npm run brand:check

  Filled from @color/syniq_logo, which has a values-night twin — so the splash mark follows the
  device theme the same way the JS palette does, with no second drawable.
-->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="${Math.round((108 * markH) / markW)}dp"
    android:viewportWidth="${markW}"
    android:viewportHeight="${markH}">
    <path
        android:fillColor="@color/syniq_logo"
        android:fillType="evenOdd"
        android:pathData="${MARK_PATH}" />
</vector>
`;

// ── Output 3: the adaptive-icon foreground ──────────────────────────────────────────────────────
//
// An adaptive icon's foreground is a 108×108dp canvas of which only the centre 72×72dp is
// guaranteed visible — the launcher masks and animates the rest. So the mark is scaled to ~55% and
// centred with a group transform rather than drawn edge to edge, which would have the corners
// clipped off by a circular mask.

const ICON_SCALE = 0.55;
const iconFile = `<?xml version="1.0" encoding="utf-8"?>
<!--
  GENERATED — DO NOT EDIT.  Source: syniq-web/.../syniq-logo-paths.ts
  Generator: scripts/sync-brand.mjs

  Adaptive-icon FOREGROUND. Scaled to ${Math.round(ICON_SCALE * 100)}% and centred inside the
  108x108dp canvas because a launcher mask only guarantees the middle 72x72dp — a mark drawn to
  the edges loses its corners to a circular mask.
-->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <group
        android:scaleX="${((108 * ICON_SCALE) / markW).toFixed(6)}"
        android:scaleY="${((108 * ICON_SCALE) / markW).toFixed(6)}"
        android:translateX="${(54 - (108 * ICON_SCALE) / 2).toFixed(3)}"
        android:translateY="${(54 - ((108 * ICON_SCALE) * (markH / markW)) / 2).toFixed(3)}">
        <path
            android:fillColor="#FFFFFFFF"
            android:fillType="evenOdd"
            android:pathData="${MARK_PATH}" />
    </group>
</vector>
`;

// ── Write / check ───────────────────────────────────────────────────────────────────────────────

const RES = join(REPO, 'android', 'app', 'src', 'main', 'res');
const files = [
  [join(REPO, 'src', 'components', 'brand', 'logo-paths.ts'), tsFile],
  [join(RES, 'drawable', 'ic_syniq_mark.xml'), vectorFile],
  [join(RES, 'drawable', 'ic_launcher_foreground.xml'), iconFile],
];

const stale = [];
for (const [path, content] of files) {
  const current = existsSync(path) ? readFileSync(path, 'utf8') : null;
  if (current === content) continue;
  if (check) stale.push(path.replace(REPO, '.'));
  else {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content, 'utf8');
  }
}

if (check) {
  if (stale.length) {
    console.error(
      `[brand] STALE — ${stale.join(', ')} no longer match syniq-web's artwork.\n` +
        'Run `npm run brand:sync` and commit the result.',
    );
    process.exit(1);
  }
  console.log('[brand] ok — mark + wordmark in sync with syniq-web.');
} else {
  console.log(
    `[brand] wrote ${files.length} files from the traced artwork ` +
      `(mark ${MARK_VIEWBOX}, wordmark ${WORDMARK_VIEWBOX}).`,
  );
}
