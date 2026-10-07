import { daysUntil, fromCivilDate, isCivilDate, toCivilDate, todayCivil } from './civil-date';

describe('toCivilDate', () => {
  it('reads the calendar day the picker showed, not the UTC one', () => {
    // ⚠ THE WHOLE POINT OF THIS MODULE. The native picker hands back a LOCAL Date. In Riyadh
    // (UTC+3) midnight local is 21:00 the previous day in UTC, so `toISOString().slice(0,10)` on
    // this value yields 2027-03-14 — a receiver picks the 15th off the carton and the batch is
    // dated the 14th. Every shelf-life sum downstream is then a day out.
    const picked = new Date(2027, 2, 15, 0, 0, 0);
    expect(toCivilDate(picked)).toBe('2027-03-15');
  });

  it('pads month and day', () => {
    expect(toCivilDate(new Date(2026, 0, 5, 13, 30))).toBe('2026-01-05');
  });

  it('is unaffected by the time of day', () => {
    expect(toCivilDate(new Date(2026, 8, 15, 23, 59, 59))).toBe('2026-09-15');
  });
});

describe('fromCivilDate', () => {
  it('builds a LOCAL date, so the picker opens on the day that was stored', () => {
    const d = fromCivilDate('2027-03-15');
    expect(d?.getFullYear()).toBe(2027);
    expect(d?.getMonth()).toBe(2);
    expect(d?.getDate()).toBe(15);
  });

  it('round-trips with toCivilDate', () => {
    expect(toCivilDate(fromCivilDate('2026-12-31')!)).toBe('2026-12-31');
  });

  it('is null for anything that is not a calendar date', () => {
    expect(fromCivilDate('')).toBeNull();
    expect(fromCivilDate('15/03/2027')).toBeNull();
    expect(fromCivilDate('2027-13-01')).toBeNull();
    expect(fromCivilDate('2027-02-30')).toBeNull();
  });
});

describe('isCivilDate', () => {
  it('accepts a real calendar date', () => {
    expect(isCivilDate('2028-02-29')).toBe(true);
  });

  it('rejects a day that does not exist', () => {
    expect(isCivilDate('2027-02-29')).toBe(false);
  });
});

describe('daysUntil', () => {
  it('counts whole days ahead', () => {
    expect(daysUntil('2026-09-25', '2026-09-15')).toBe(10);
  });

  it('is zero on the day itself', () => {
    expect(daysUntil('2026-09-15', '2026-09-15')).toBe(0);
  });

  it('goes negative for a date already past', () => {
    expect(daysUntil('2026-09-14', '2026-09-15')).toBe(-1);
  });

  it('crosses a month and a year boundary', () => {
    expect(daysUntil('2027-01-01', '2026-12-30')).toBe(2);
  });
});

describe('todayCivil', () => {
  it('is the local calendar day', () => {
    expect(todayCivil(new Date(2026, 8, 15, 2, 0, 0))).toBe('2026-09-15');
  });
});
