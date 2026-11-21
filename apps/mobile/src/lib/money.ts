import type { CurrencyCode } from '@/types';

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  SGD: 'S$',
  AED: 'AED ',
  CAD: 'C$',
  AUD: 'A$',
};

export const SUPPORTED_CURRENCIES: { code: CurrencyCode; symbol: string; name: string }[] = [
  { code: 'INR', symbol: '₹', name: 'indian rupee (INR)' },
  { code: 'USD', symbol: '$', name: 'us dollar (USD)' },
  { code: 'EUR', symbol: '€', name: 'euro (EUR)' },
  { code: 'GBP', symbol: '£', name: 'british pound (GBP)' },
  { code: 'SGD', symbol: 'S$', name: 'singapore dollar (SGD)' },
  { code: 'AED', symbol: 'AED', name: 'uae dirham (AED)' },
  { code: 'CAD', symbol: 'C$', name: 'canadian dollar (CAD)' },
  { code: 'AUD', symbol: 'A$', name: 'australian dollar (AUD)' },
];

const EU_REGIONS = new Set([
  'DE', 'FR', 'ES', 'IT', 'NL', 'IE', 'AT', 'BE', 'FI', 'GR',
  'PT', 'LU', 'EE', 'LV', 'LT', 'SK', 'SI', 'MT', 'CY', 'HR',
]);

function normalizeLocaleTag(locale: string, currency: string): string {
  if (!locale) return currency === 'INR' ? 'en-IN' : 'en-US';
  if (locale.includes('-')) return locale;
  switch (locale.toLowerCase()) {
    case 'hi':
      return 'hi-IN';
    case 'ta':
      return 'ta-IN';
    case 'mr':
      return 'mr-IN';
    case 'es':
      return 'es-ES';
    case 'en':
    default:
      return currency.toUpperCase() === 'INR' ? 'en-IN' : 'en-US';
  }
}

function formatInrLakhFallback(majorInt: string): string {
  if (majorInt.length <= 3) return majorInt;
  const lastThree = majorInt.slice(-3);
  const rest = majorInt.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
}

function formatStandardGroupingFallback(majorInt: string): string {
  return majorInt.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function manualFormatMoney(minor: number, currency: string): string {
  const safeMinor = Number.isFinite(minor) ? Math.round(minor) : 0;
  const isNeg = safeMinor < 0;
  const absMinor = Math.abs(safeMinor);
  const hasCents = absMinor % 100 !== 0;
  const majorWhole = Math.floor(absMinor / 100).toString();
  const cents = String(absMinor % 100).padStart(2, '0');
  const code = (currency?.toUpperCase() || 'INR') as CurrencyCode;
  const symbol = CURRENCY_SYMBOLS[code] ?? `${code} `;
  const grouped =
    code === 'INR'
      ? formatInrLakhFallback(majorWhole)
      : formatStandardGroupingFallback(majorWhole);
  const digits = hasCents ? `${grouped}.${cents}` : grouped;
  return `${isNeg ? '-' : ''}${symbol}${digits}`;
}

/**
 * Formats integer minor units (e.g. paise/cents) into display currency string.
 * Wraps Intl.NumberFormat in try/catch with manual INR lakh grouping fallback (§10.3).
 */
export function formatMoney(
  minor: number,
  currency: string = 'INR',
  locale: string = 'en-IN'
): string {
  const safeMinor = Number.isFinite(minor) ? Math.round(minor) : 0;
  const code = (currency?.toUpperCase() || 'INR') as CurrencyCode;
  const major = safeMinor / 100;
  const hasFraction = safeMinor % 100 !== 0;

  try {
    const tag = normalizeLocaleTag(locale, code);
    const formatter = new Intl.NumberFormat(tag, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: hasFraction ? 2 : 0,
      maximumFractionDigits: hasFraction ? 2 : 0,
    });
    return formatter.format(major);
  } catch {
    return manualFormatMoney(safeMinor, code);
  }
}

/**
 * Parses a major-unit user input string (e.g. "950" or "950.50") into integer minor units.
 */
export function parseMoneyInput(text: string): number {
  if (!text) return 0;
  const cleaned = text.replace(/[^0-9.]/g, '');
  if (!cleaned) return 0;
  const parts = cleaned.split('.');
  const wholePart = parts[0] || '0';
  const fracPart = parts.length > 1 ? (parts[1] || '').slice(0, 2).padEnd(2, '0') : '00';
  const whole = parseInt(wholePart, 10);
  const frac = parseInt(fracPart, 10);
  if (!Number.isFinite(whole) || whole < 0) return 0;
  return whole * 100 + (Number.isFinite(frac) ? frac : 0);
}

/**
 * Maps ISO region code to default currency (§7.2).
 */
export function defaultCurrencyForRegion(regionCode?: string | null): CurrencyCode {
  if (!regionCode) return 'INR';
  const r = regionCode.toUpperCase();
  if (r === 'IN') return 'INR';
  if (r === 'US') return 'USD';
  if (r === 'GB' || r === 'UK') return 'GBP';
  if (EU_REGIONS.has(r)) return 'EUR';
  if (r === 'SG') return 'SGD';
  if (r === 'AE') return 'AED';
  if (r === 'CA') return 'CAD';
  if (r === 'AU') return 'AUD';
  return 'USD';
}

/**
 * Returns the Explore quick-filter chip threshold in minor units (§7.6).
 */
export function underChipMinorForCurrency(currency: CurrencyCode): {
  label: string;
  maxMinor: number;
} {
  if (currency === 'INR') {
    return { label: `under ${formatMoney(50000, 'INR', 'en-IN')}`, maxMinor: 50000 };
  }
  return { label: `under ${formatMoney(1000, currency, 'en-US')}`, maxMinor: 1000 };
}
