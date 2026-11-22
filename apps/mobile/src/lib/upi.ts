import * as Linking from 'expo-linking';
import * as Crypto from 'expo-crypto';

export const UPI_ID_RE = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
export const UTR_RE = /^\d{12}$/;

export interface UpiPayParams {
  vpa: string;
  payeeName: string;
  amountMinor: number;
  note: string;
  txnRef: string;
}

export function makeDealTxnRef(shortCode: string): string {
  return ('MD' + shortCode.replace(/[^A-Za-z0-9]/g, '') + Date.now().toString(36)).slice(0, 35);
}

export function makeWalletTxnRef(): string {
  return ('MW' + Date.now().toString(36)).slice(0, 35);
}

export function buildUpiPayUrl(p: UpiPayParams): string {
  if (!Number.isInteger(p.amountMinor) || p.amountMinor <= 0) {
    throw new Error('amountMinor must be a positive integer');
  }
  const vpa = (p.vpa || '').trim();
  if (!UPI_ID_RE.test(vpa)) {
    throw new Error('invalid payee vpa');
  }
  const tr = (p.txnRef || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 35);
  if (!tr) {
    throw new Error('invalid txnRef');
  }
  const pn = encodeURIComponent((p.payeeName || 'Mudra Escrow').trim());
  const tn = encodeURIComponent((p.note || '').trim().slice(0, 50));
  const am = (p.amountMinor / 100).toFixed(2);
  return `upi://pay?pa=${vpa}&pn=${pn}&am=${am}&cu=INR&tn=${tn}&tr=${tr}`;
}

export async function openUpiApp(p: UpiPayParams): Promise<'opened' | 'no_app'> {
  const url = buildUpiPayUrl(p);
  try {
    await Linking.openURL(url);
    return 'opened';
  } catch {
    return 'no_app';
  }
}

export function makeTestUtr(): string {
  const bytes = Crypto.getRandomBytes(12);
  let out = '9';
  for (let i = 1; i < 12; i++) {
    out += String(bytes[i] % 10);
  }
  return out;
}
