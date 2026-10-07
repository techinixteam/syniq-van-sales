import { ApiError, SessionExpiredError } from '@/api/apiClient';
import { creditReasonCodes, errorMessage, presentError } from '@/api/errors';
import { errors } from '@/i18n/bundles/errors';

/** A stand-in for i18next: returns the key, so a test can see WHICH string was chosen. */
const t = (key: string) => key;

describe('branching on the code, never the message', () => {
  it('picks the translated sentence for a code the bundle carries', () => {
    const e = new ApiError('Van VAN-0001 is not assigned to you.', 403, 'O2C_VAN_NOT_ASSIGNED_TO_YOU');
    expect(presentError(e).key).toBe('err.O2C_VAN_NOT_ASSIGNED_TO_YOU');
    expect(errorMessage(e, t)).toBe('err.O2C_VAN_NOT_ASSIGNED_TO_YOU');
  });

  it('ignores the English prose entirely when choosing', () => {
    const a = new ApiError('Refused.', 403, 'SCOPE_DENIED');
    const b = new ApiError('Refused.', 422, 'PERIOD_NOT_OPEN');
    expect(presentError(a).key).not.toBe(presentError(b).key);
  });

  it('every bundled code is translated — the bundle IS the list', () => {
    for (const code of Object.keys(errors.en.err)) {
      expect(presentError(new ApiError('x', 400, code)).key).toBe(`err.${code}`);
    }
  });
});

describe('the specifics survive translation', () => {
  it('shows the server’s detail UNDER the sentence when it names the article and the quantity', () => {
    const e = new ApiError('Van VAN-0001 holds 2 of 1001 Water; 6 was asked for.', 422, 'O2C_VAN_INSUFFICIENT_STOCK');
    expect(errorMessage(e, t)).toBe('err.O2C_VAN_INSUFFICIENT_STOCK\nVan VAN-0001 holds 2 of 1001 Water; 6 was asked for.');
  });

  it('shows the server sentence for an untranslated code', () => {
    const e = new ApiError('Something specific happened on line 3', 422, 'SOMETHING_NEW');
    expect(presentError(e).key).toBeNull();
    expect(errorMessage(e, t)).toBe('Something specific happened on line 3');
  });

  it('falls back to the generic sentence only when there is no detail at all', () => {
    expect(errorMessage(new ApiError('   ', 500, 'MYSTERY'), t)).toBe('error.generic');
  });
});

describe('credit refusals — the reasons, from either wire shape', () => {
  it('reads AR_CREDIT_BLOCKED’s reasons from the DETAIL (the error filter drops the array)', () => {
    const e = new ApiError('Refused by credit control: AR_NOT_ON_ACCOUNT, AR_OVER_CREDIT_LIMIT', 422, 'AR_CREDIT_BLOCKED', {
      code: 'AR_CREDIT_BLOCKED',
      detail: 'Refused by credit control: AR_NOT_ON_ACCOUNT, AR_OVER_CREDIT_LIMIT',
    });
    expect(creditReasonCodes(e)).toEqual(['AR_NOT_ON_ACCOUNT', 'AR_OVER_CREDIT_LIMIT']);
    expect(errorMessage(e, t)).toBe(
      'err.AR_CREDIT_BLOCKED\n• creditReason.AR_NOT_ON_ACCOUNT\n• creditReason.AR_OVER_CREDIT_LIMIT',
    );
  });

  it('reads O2C_CREDIT_BLOCKED’s reasons from errors.reasonCodes', () => {
    const e = new ApiError('Refused by credit control', 422, 'O2C_CREDIT_BLOCKED', {
      errors: { reasonCodes: ['AR_OVERDUE_DAYS_EXCEEDED'] },
    });
    expect(presentError(e).reasonKeys).toEqual(['creditReason.AR_OVERDUE_DAYS_EXCEEDED']);
  });

  it('an unknown reason is skipped rather than shown as a raw key', () => {
    const e = new ApiError('Refused by credit control: AR_SOMETHING_NEW', 422, 'AR_CREDIT_BLOCKED');
    expect(presentError(e).reasonKeys).toEqual([]);
    expect(errorMessage(e, t)).toBe('err.AR_CREDIT_BLOCKED');
  });
});

describe('403 is a refusal, not a failure', () => {
  it('flags a 403 so the screen can render a refusal', () => {
    expect(presentError(new ApiError('no', 403, 'SCOPE_DENIED')).forbidden).toBe(true);
    expect(presentError(new ApiError('no', 422, 'NEGATIVE_STOCK')).forbidden).toBe(false);
  });
});

describe('non-response failures — none of them may read as "saved"', () => {
  it('maps an expired session', () => {
    expect(presentError(new SessionExpiredError()).key).toBe('error.sessionExpired');
    expect(presentError(new Error('Your session has expired. Please sign in again.')).key).toBe('error.sessionExpired');
  });

  it('maps a timeout', () => {
    expect(presentError(new Error('The server took too long to answer. Check the connection and try again.')).key).toBe(
      'error.timeout',
    );
  });

  it('treats anything else as a connection failure', () => {
    expect(presentError(new Error('Network request failed')).key).toBe('error.offline');
  });

  it('survives a non-Error throw', () => {
    expect(presentError('a string').key).toBe('error.generic');
    expect(presentError(undefined).key).toBe('error.generic');
  });
});

describe('the bundle', () => {
  it('has an Arabic sentence for every code and every credit reason', () => {
    expect(Object.keys(errors.ar.err).sort()).toEqual(Object.keys(errors.en.err).sort());
    expect(Object.keys(errors.ar.creditReason).sort()).toEqual(Object.keys(errors.en.creditReason).sort());
  });
});
