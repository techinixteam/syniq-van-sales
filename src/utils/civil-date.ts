/**
 * Calendar dates, as the person holding the device reads them.
 *
 * A production date or an expiry date is a CIVIL date — a day on a calendar, printed on a carton.
 * It has no time and no timezone. The native date picker, however, hands back a `Date`, which is an
 * instant; and the obvious way to turn one into `YYYY-MM-DD` is `toISOString().slice(0, 10)`, which
 * is WRONG everywhere east of Greenwich.
 *
 * In Riyadh (UTC+3) the picker's midnight-local is 21:00 the PREVIOUS day in UTC. A receiver picks
 * the 15th off the carton, the batch is dated the 14th, and every shelf-life sum downstream is a day
 * out — silently, in the direction that accepts stock it should have refused. So the conversion goes
 * through the LOCAL calendar fields in both directions, and never through UTC.
 */

const CIVIL = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (n: number): string => String(n).padStart(2, '0');

/** The calendar day this instant falls on WHERE THE DEVICE IS. */
export function toCivilDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Local midnight on that calendar day, or null if the string is not one.
 *
 * Rejects a date that does not exist (2027-02-29, 2027-13-01) rather than letting the Date
 * constructor roll it forward into a neighbouring month, which would store a day nobody picked.
 */
export function fromCivilDate(s: string): Date | null {
  const m = CIVIL.exec(s);
  if (!m) return null;
  const [y, mo, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || day < 1 || day > 31) return null;
  const d = new Date(y, mo - 1, day);
  // The roll-forward check: February 30th becomes March 2nd, and the fields no longer agree.
  return d.getFullYear() === y && d.getMonth() === mo - 1 && d.getDate() === day ? d : null;
}

export const isCivilDate = (s: string): boolean => fromCivilDate(s) !== null;

export const todayCivil = (now: Date = new Date()): string => toCivilDate(now);

/**
 * Whole days from `from` to `iso`. Negative once the date is past; zero on the day itself, because a
 * carton expiring today has no life left, whatever the clock says.
 *
 * Counted in UTC deliberately: both ends are civil dates with no time, so building them at UTC
 * midnight makes the subtraction exact and immune to a daylight-saving step in between.
 */
export function daysUntil(iso: string, from: string = todayCivil()): number {
  const a = CIVIL.exec(from);
  const b = CIVIL.exec(iso);
  if (!a || !b) return 0;
  const utc = (m: RegExpExecArray) => Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Math.round((utc(b) - utc(a)) / 86_400_000);
}
