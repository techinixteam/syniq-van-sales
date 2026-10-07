#!/usr/bin/env node
/**
 * sync-permissions — emit the compile-time authz unions FROM the server's permission catalog.
 *
 *   node scripts/sync-permissions.mjs           rewrite src/authz/permissions.generated.ts
 *   node scripts/sync-permissions.mjs --check   fail (exit 1) if it is stale
 *
 * A direct port of `syniq-web/scripts/gen-permissions.mjs`, and it keeps that file's central
 * discipline: emit ONLY the unions. The display catalog — every permission's EN + AR name — is
 * deliberately NOT baked in. Baking it in put 72 KB of Arabic strings in the web's entry chunk;
 * on a handheld the same mistake costs startup time on a device chosen for its scanner, not its
 * CPU. Anything that needs display names fetches `GET /iam/permissions/catalog` at runtime, so it
 * shows what the DEPLOYED server enforces rather than whatever was true at last generation.
 *
 * The point of the unions is that `usePermission('display', 'inventory_stok')` is a COMPILE error.
 * A gate with a typo'd object silently returns false forever — it hides a tile and raises no alarm.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const SOURCE = resolve(REPO, '..', 'syniq-server', 'contracts', 'permissions.json');
const OUT = join(REPO, 'src', 'authz', 'permissions.generated.ts');

const check = process.argv.includes('--check');

if (!existsSync(SOURCE)) {
  console.error(
    `[perms] permission catalog not found at:\n  ${SOURCE}\n\n` +
      'This repo generates its authz unions from the sibling syniq-server checkout. The generated\n' +
      'file is committed, so an ordinary build does not need it — only perms:sync/check do.',
  );
  process.exit(1);
}

const cat = JSON.parse(readFileSync(SOURCE, 'utf8'));
const objects = [...new Set(cat.permissions.map((p) => p.authObject))].sort();
const activities = cat.activities;
const codes = cat.permissions.map((p) => p.code).sort();

if (!objects.length || !activities?.length || !codes.length) {
  console.error('[perms] catalog parsed empty — the source shape changed.');
  process.exit(1);
}

const content = `// AUTO-GENERATED from syniq-server/contracts/permissions.json. Do not edit.
// Run: npm run perms:sync   ·   Guard: npm run perms:check
export const AUTH_OBJECTS = ${JSON.stringify(objects)} as const;
export const ACTIVITIES = ${JSON.stringify(activities)} as const;
export const PERMISSION_CODES = ${JSON.stringify(codes)} as const;
`;

const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : null;

if (check) {
  if (current !== content) {
    console.error(
      '[perms] STALE — src/authz/permissions.generated.ts no longer matches the server catalog.\n' +
        'Run `npm run perms:sync` and commit the result.',
    );
    process.exit(1);
  }
  console.log(`[perms] ok — ${codes.length} permissions, ${objects.length} objects in sync.`);
} else {
  writeFileSync(OUT, content, 'utf8');
  console.log(
    `[perms] wrote src/authz/permissions.generated.ts (${codes.length} permissions, ` +
      `${objects.length} objects, ${activities.length} activities).`,
  );
}
