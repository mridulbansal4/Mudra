/// <reference types="jest" />
import {
  UPI_ID_RE,
  UTR_RE,
  buildUpiPayUrl,
  makeDealTxnRef,
  makeTestUtr,
} from '../upi';

jest.mock('expo-linking', () => ({
  openURL: jest.fn(),
}));

jest.mock('expo-crypto', () => ({
  getRandomBytes: (n: number) => {
    const arr = new Uint8Array(n);
    for (let i = 0; i < n; i++) arr[i] = i + 1;
    return arr;
  },
}));

describe('buildUpiPayUrl & UPI helpers', () => {
  it('formats am=950.00, keeps raw @ in pa, encodes tn spaces as %20, and caps tr alphanumeric <= 35', () => {
    const trRaw = makeDealTxnRef('MD-2611-0042-EXTRALONG-12345678901234567890');
    const url = buildUpiPayUrl({
      vpa: 'mudra.escrow@upi',
      payeeName: 'Mudra Escrow',
      amountMinor: 95000,
      note: 'mudra escrow MD-2611-0042',
      txnRef: trRaw,
    });

    expect(url.startsWith('upi://pay?')).toBe(true);
    expect(url).toContain('pa=mudra.escrow@upi');
    expect(url).not.toContain('%40');
    expect(url).toContain('pn=Mudra%20Escrow');
    expect(url).toContain('am=950.00');
    expect(url).toContain('cu=INR');
    expect(url).toContain('tn=mudra%20escrow%20MD-2611-0042');
    expect(url).not.toContain('+');

    const trMatch = url.match(/&tr=([^&]+)$/);
    expect(trMatch).not.toBeNull();
    const tr = trMatch![1];
    expect(tr).toMatch(/^[A-Za-z0-9]{1,35}$/);
    expect(tr.length).toBeLessThanOrEqual(35);
  });

  it('rejects 0, negative, or fractional paise amountMinor', () => {
    const base = {
      vpa: 'mudra.escrow@upi',
      payeeName: 'Mudra Escrow',
      note: 'test',
      txnRef: 'MD26110042',
    };
    expect(() => buildUpiPayUrl({ ...base, amountMinor: 0 })).toThrow();
    expect(() => buildUpiPayUrl({ ...base, amountMinor: -100 })).toThrow();
    expect(() => buildUpiPayUrl({ ...base, amountMinor: 950.5 })).toThrow();
  });

  it('validates UPI_ID_RE, UTR_RE, and makeTestUtr', () => {
    expect(UPI_ID_RE.test('rohan.user_1-2@okaxis')).toBe(true);
    expect(UPI_ID_RE.test('invalid')).toBe(false);
    const utr = makeTestUtr();
    expect(UTR_RE.test(utr)).toBe(true);
    expect(utr.startsWith('9')).toBe(true);
  });
});
