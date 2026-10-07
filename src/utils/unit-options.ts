import type { PackagingLevel, PackagingProfile } from '@/api/article.api';

/**
 * The unit picker behind a receiving line — options derived from the article's OWN packaging ladder
 * (`GET /articles/{id}/packaging-profile`), never typed.
 *
 * ⚠ A typed unit was the live defect this replaces: "CTN" where the article knows "CASE", or "ea"
 * on an article whose base is "PC", answered 422 "UoM not set up" at posting time — after the
 * scanning was done. Offering only the units the article actually has makes the mistake impossible
 * and shows the receiver what a case IS ("CASE · 12 EA") before they count in it.
 */
export interface UnitOption {
  key: string;
  label: string;
  detail: string;
  /**
   * EVERY barcode that identifies THIS packaging level, or a one-entry list carrying the caller's
   * "no barcode" wording.
   *
   * ⭐ EVERY LEVEL CARRIES ITS OWN GTINS and they are not interchangeable across levels: a case of
   * twelve has a GTIN-14 of its own, and scanning it books twelve where the each-code books one.
   * Printing them beside the unit is how a receiver checks — against the carton in their hand —
   * that the unit they are about to count in is the unit the label denominates.
   *
   * ⭐⭐ LISTED IN FULL, NEVER SUMMARISED. A level carries several when a case has been re-labelled
   * or a second supplier ships the same goods under their own GTIN, and the carton on the bay bears
   * exactly ONE of them. "16281234567897 +1" tells a receiver holding the other code nothing — it
   * hides the very digits they need to match.
   */
  codes: string[];
}

/** "12 EA" for a case of twelve; "1/3 EA" for a rational ratio; "base unit" for the base itself. */
export function ratioLabel(level: Pick<PackagingLevel, 'ratioToBaseNum' | 'ratioToBaseDen' | 'isBase'>, base: string | null, baseUnitWord: string): string {
  if (level.isBase) return baseUnitWord;
  const unit = base ?? '';
  return level.ratioToBaseDen === '1' ? `${level.ratioToBaseNum} ${unit}`.trim() : `${level.ratioToBaseNum}/${level.ratioToBaseDen} ${unit}`.trim();
}

/**
 * Every barcode on the level, in the order the server sends them (`is_primary` first) — empty when
 * nobody has barcoded it.
 */
export function unitBarcodes(level: Pick<PackagingLevel, 'gtins'>): string[] {
  return level.gtins;
}

/** The picker's rows, in the ladder's order (ascending pack size, as the server derives it). */
export function unitOptions(profile: PackagingProfile, baseUnitWord: string, noBarcodeWord: string): UnitOption[] {
  return profile.levels.map((level) => ({
    key: level.uomCode,
    label: level.uomCode,
    detail: ratioLabel(level, profile.base, baseUnitWord),
    codes: unitBarcodes(level).length > 0 ? unitBarcodes(level) : [noBarcodeWord],
  }));
}

/**
 * What the CHOSEN unit holds — "CAR (12 BOX)" — for the receiving line itself, not the picker.
 *
 * The picker already shows the ratio against the base ("CASE · 12 EA"). The LINE showed only the
 * bare code, so "3 CAR" told a receiver standing over a pallet nothing about what they had
 * counted. The label is the server's, composed once there; nothing is derived here.
 *
 * Null for the base, for a unit not on the ladder, and for every article until someone configures
 * a packaging hierarchy — the line then shows the bare code exactly as it always did.
 */
export function unitLabelFor(profile: PackagingProfile, uomCode: string | null | undefined): string | null {
  if (!uomCode) return null;
  return profile.levels.find((l) => l.uomCode === uomCode)?.uomLabel ?? null;
}

/**
 * The unit a freshly scanned line starts in: the unit the SCANNED barcode denominates when the
 * article has it (a case GTIN starts in CASE — that is the unit the operator is holding); otherwise
 * the base; null when the article has no units at all (it cannot be received — say so, don't guess).
 */
export function defaultUnit(profile: PackagingProfile, scannedUomCode: string | null | undefined): string | null {
  if (scannedUomCode && profile.levels.some((l) => l.uomCode === scannedUomCode)) return scannedUomCode;
  return profile.base ?? profile.levels[0]?.uomCode ?? null;
}
