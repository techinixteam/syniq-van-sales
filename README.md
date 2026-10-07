# syniq-van-sales

**SYNIQ Van Sales** — the Android app a B2B van sales rep runs on the road: a tax invoice from their own
van, quotations, what is on the van, and what the distribution centre holds.

## What this is

| | |
|---|---|
| Stack | Bare React Native **0.85.3** · React **19.2.3** · TypeScript strict · **Android only** — the syniq-opr-app skeleton |
| Talks to | **`syniq-server` directly** (`api.syniqerp.com`) |
| Offline | **None.** Every read and write goes to the live server. A failed call says nothing was saved. |
| Who | A login holding **`VAN_SALES_REP` at COMPANY scope**, home branch a B2B branch, linked to a salesperson who has a van |
| Look & feel | syniq-web's Fiori palette and SyniQ mark, **generated** from the sibling repos (teal launcher icon) |
| Session | Tokens in the **Android keystore** (`react-native-keychain`), never AsyncStorage |

### Screens

| Screen | Server |
|---|---|
| Sign in · You (van, language, theme, sign out) | `/auth/*` |
| Home — the six tiles, or exactly what is missing (role / B2B branch / salesperson link / van) | `/o2c/van-sales/my-vans` |
| **New invoice** — customer → items → server-priced total → **Post** → View / Share PDF | `/b2b-customers/search`, `/finance/ar/credit/exposure`, `/articles/search`, `/o2c/price-preview`, **`POST /o2c/van-sales`**, `/finance/ar-invoices/:id/print.pdf` |
| Invoices — this van's tax invoices → detail → PDF (a reprint asks for a reason) | `/finance/ar-invoices?vanId` |
| New quotation — same basket, validity dates → saved as DRAFT | `POST /o2c/quotations` |
| Quotations — the rep's own → detail → **share as text** (there is no quotation PDF) | `/o2c/van-sales/quotations` |
| My van — quantities on the van now | `/o2c/vans/:id/stock` |
| DC stock — what the DC holds, in packs | `/inventory/dc-stock` |

## Getting started

```bash
npm install
npm run android          # device or emulator (debug build, Metro)
npm start                # metro only
```

`ANDROID_HOME` must point at the SDK. There is no `ios/` directory and that is deliberate.

**Dev server.** A debug build talks to `http://localhost:3000` (`src/config/env.ts`). On the emulator or a
USB phone that needs the tunnel, and it does not survive a replug:

```bash
adb reverse tcp:3000 tcp:3000
```

A release build talks to `https://api.syniqerp.com` only (cleartext is debug-only).

## Gates

```bash
npm run verify           # typecheck → lint → test → tokens:check → perms:check → brand:check
```

| Script | Reads | Writes |
|---|---|---|
| `npm run tokens:sync` | `../syniq-web/src/styles/globals.css` | `src/theme/tokens/colors.{light,dark}.ts`, `radius.ts` |
| `npm run perms:sync` | `../syniq-server/contracts/permissions.json` | `src/authz/permissions.generated.ts` |
| `npm run brand:sync` | `../syniq-web/src/shared/ui/brand/syniq-logo-paths.ts` | RN paths, Android vector drawable, adaptive icon |

The generated files are committed and pinned to LF in `.gitattributes` — with `core.autocrlf=true` a
Windows checkout would otherwise turn them into CRLF and every `:check` would report STALE.

## Build an APK

```bash
cd android && gradlew.bat assembleDebug      # android/app/build/outputs/apk/debug/app-debug.apk
cd android && gradlew.bat assembleRelease    # android/app/build/outputs/apk/release/app-release.apk
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

⚠ **The release build is still signed with the debug keystore** (as syniq-opr-app is). Before handing
APKs to reps, generate a real release keystore, keep it OUT of git, and point `signingConfigs.release`
at it — an APK signed with one key can never be upgraded in place by one signed with another.

## Layout

```
src/api/         apiClient.ts (bearer, ONE single-flight refresh, ApiError) · token-store.ts (keystore)
                 one *.api.ts per server door · errors.ts — server code → sentence (+ credit reasons)
src/authz/       the permission port — a direct copy of syniq-web's model
src/components/  common/ primitives · ops/ ActionBar, QtyField · sales/ customer, basket, totals
src/contexts/    Auth · Theme · NetworkStatus · Van (company + the rep's van; van-session.ts is the pure rule)
src/hooks/       useSaleDraft (basket + server preview) · useInvoicePdf · useAsync · useDebounced
src/i18n/        bundles/ — en + ar twins, typed `ar: typeof en`; bundles/index.ts is the one list
src/screens/     Home · Sale · Invoices · Quotations · Stock · Profile · Auth
src/services/    invoice-pdf.ts — download (a PRINT on the server), view, share
src/utils/       sale-draft · quotation-text · van-stock · qty · money · civil-date · draft-idempotency
```

## Things that will bite you

1. **The sale is `POST /o2c/van-sales`, never `/o2c/direct-invoices`.** The rep holds `van_sale.create`,
   not `ar_invoice.approve` — the server checks on every call that the van's salesperson is the caller.
2. **Every route is COMPANY-scoped, and `/auth/me` names no company.** The company comes from the rep's
   own `van_sale.create` grant (`contexts/van-session.ts`). A rep assigned at SITE scope is refused
   everywhere; the Home screen says so.
3. **A van sale is sent under the DRAFT's Idempotency-Key** (`utils/draft-idempotency.ts`): reused for the
   identical basket after a lost answer, dropped after any real answer. The route REQUIRES the header. A
   fresh key per tap is how a dead mobile signal sells the van's stock twice.
4. **No money is computed on the phone.** Prices, VAT and totals come from `POST /o2c/price-preview`, and
   the preview is tagged with the basket it priced — Post is disabled until it is fresh.
5. **Every PDF download is a PRINT on the server.** The first is the original; later ones are reprints
   that need a reason and `document_reprint.create`. The app keeps what it downloaded and re-shares that.
6. **Customers must be on account.** A van sale always creates a receivable; a customer not flagged
   on-account is refused (`AR_CREDIT_BLOCKED` · `AR_NOT_ON_ACCOUNT`). Cash sales are not in v1.
7. **Refresh tokens rotate and are single-use.** Every 401 — JSON or PDF — waits on the same
   `refreshAccessToken()`; two refreshes racing would sign the rep out mid-sale.
8. **Name search needs `pg_trgm`** on the server's database. The dev DB lost it in a restore, so there a
   name search fails while number and barcode searches work.
9. **A language change needs a restart** (native layout direction).

## Not in v1

Offline mode · camera scanning (a keyboard-wedge / Bluetooth scanner types into the item search) ·
Bluetooth printing (share the PDF to the printer's app) · cash sales and collections · quotation PDF and
quotation send / accept / convert · load / unload requests · iOS.
