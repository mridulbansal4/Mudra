import * as Localization from 'expo-localization';
import {
  isValidPhoneNumber,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js';

export interface CountryOption {
  code: CountryCode;
  dialCode: string;
  name: string;
  label: string; // Flag-free display e.g. "+91 IN" (§7.2)
}

/**
 * 40 common countries from §7.2 with flag-free labels.
 */
export const COUNTRIES: CountryOption[] = [
  { code: 'IN', dialCode: '+91', name: 'India', label: '+91 IN' },
  { code: 'US', dialCode: '+1', name: 'United States', label: '+1 US' },
  { code: 'GB', dialCode: '+44', name: 'United Kingdom', label: '+44 GB' },
  { code: 'CA', dialCode: '+1', name: 'Canada', label: '+1 CA' },
  { code: 'AU', dialCode: '+61', name: 'Australia', label: '+61 AU' },
  { code: 'SG', dialCode: '+65', name: 'Singapore', label: '+65 SG' },
  { code: 'AE', dialCode: '+971', name: 'United Arab Emirates', label: '+971 AE' },
  { code: 'DE', dialCode: '+49', name: 'Germany', label: '+49 DE' },
  { code: 'FR', dialCode: '+33', name: 'France', label: '+33 FR' },
  { code: 'ES', dialCode: '+34', name: 'Spain', label: '+34 ES' },
  { code: 'IT', dialCode: '+39', name: 'Italy', label: '+39 IT' },
  { code: 'NL', dialCode: '+31', name: 'Netherlands', label: '+31 NL' },
  { code: 'IE', dialCode: '+353', name: 'Ireland', label: '+353 IE' },
  { code: 'NZ', dialCode: '+64', name: 'New Zealand', label: '+64 NZ' },
  { code: 'MY', dialCode: '+60', name: 'Malaysia', label: '+60 MY' },
  { code: 'ID', dialCode: '+62', name: 'Indonesia', label: '+62 ID' },
  { code: 'PH', dialCode: '+63', name: 'Philippines', label: '+63 PH' },
  { code: 'TH', dialCode: '+66', name: 'Thailand', label: '+66 TH' },
  { code: 'VN', dialCode: '+84', name: 'Vietnam', label: '+84 VN' },
  { code: 'JP', dialCode: '+81', name: 'Japan', label: '+81 JP' },
  { code: 'KR', dialCode: '+82', name: 'South Korea', label: '+82 KR' },
  { code: 'CN', dialCode: '+86', name: 'China', label: '+86 CN' },
  { code: 'HK', dialCode: '+852', name: 'Hong Kong', label: '+852 HK' },
  { code: 'BR', dialCode: '+55', name: 'Brazil', label: '+55 BR' },
  { code: 'MX', dialCode: '+52', name: 'Mexico', label: '+52 MX' },
  { code: 'AR', dialCode: '+54', name: 'Argentina', label: '+54 AR' },
  { code: 'ZA', dialCode: '+27', name: 'South Africa', label: '+27 ZA' },
  { code: 'NG', dialCode: '+234', name: 'Nigeria', label: '+234 NG' },
  { code: 'KE', dialCode: '+254', name: 'Kenya', label: '+254 KE' },
  { code: 'EG', dialCode: '+20', name: 'Egypt', label: '+20 EG' },
  { code: 'SA', dialCode: '+966', name: 'Saudi Arabia', label: '+966 SA' },
  { code: 'QA', dialCode: '+974', name: 'Qatar', label: '+974 QA' },
  { code: 'PK', dialCode: '+92', name: 'Pakistan', label: '+92 PK' },
  { code: 'BD', dialCode: '+880', name: 'Bangladesh', label: '+880 BD' },
  { code: 'LK', dialCode: '+94', name: 'Sri Lanka', label: '+94 LK' },
  { code: 'NP', dialCode: '+977', name: 'Nepal', label: '+977 NP' },
  { code: 'SE', dialCode: '+46', name: 'Sweden', label: '+46 SE' },
  { code: 'NO', dialCode: '+47', name: 'Norway', label: '+47 NO' },
  { code: 'CH', dialCode: '+41', name: 'Switzerland', label: '+41 CH' },
  { code: 'PL', dialCode: '+48', name: 'Poland', label: '+48 PL' },
];

/**
 * Detects default country code from device region via expo-localization, falling back to 'IN'.
 */
export function getDefaultCountryCode(): CountryCode {
  try {
    const region = Localization.getLocales?.()?.[0]?.regionCode?.toUpperCase();
    if (region && COUNTRIES.some((c) => c.code === region)) {
      return region as CountryCode;
    }
  } catch {
    // ignore localization errors
  }
  return 'IN';
}

export function getCountryByCode(code: string): CountryOption {
  const upper = code?.toUpperCase();
  return COUNTRIES.find((c) => c.code === upper) ?? COUNTRIES[0];
}

/**
 * Validates and formats a phone number into E.164 using libphonenumber-js (§7.2).
 */
export function validateAndFormatE164(
  nationalNumber: string,
  countryCode: string = 'IN'
): { valid: boolean; e164: string } {
  const raw = (nationalNumber || '').trim();
  if (!raw) return { valid: false, e164: '' };

  const cc = (countryCode?.toUpperCase() || 'IN') as CountryCode;
  try {
    const parsed = raw.startsWith('+')
      ? parsePhoneNumberFromString(raw)
      : parsePhoneNumberFromString(raw, cc);

    if (parsed && parsed.isValid()) {
      return { valid: true, e164: parsed.number };
    }

    if (isValidPhoneNumber(raw, cc)) {
      const p2 = parsePhoneNumberFromString(raw, cc);
      if (p2) return { valid: true, e164: p2.number };
    }
  } catch {
    // fallback below
  }

  // Fallback check for seeded demo numbers (+919000000001, +919000000002)
  const digitsOnly = raw.replace(/\D/g, '');
  const country = getCountryByCode(cc);
  const candidate = raw.startsWith('+') ? `+${digitsOnly}` : `${country.dialCode}${digitsOnly}`;
  if (/^\+9190000000(01|02|1\d)$/.test(candidate)) {
    return { valid: true, e164: candidate };
  }

  return { valid: false, e164: candidate };
}

/**
 * Masks an E.164 phone number except the last 4 digits (§7.17).
 */
export function maskPhone(e164?: string | null): string {
  if (!e164) return '';
  const cleaned = e164.trim();
  if (cleaned.length <= 4) return cleaned;
  const last4 = cleaned.slice(-4);
  const prefix = cleaned.slice(0, Math.min(3, cleaned.length - 4));
  return `${prefix} •••• ${last4}`;
}

export const maskPhoneE164 = maskPhone;

const WEAK_PINS = new Set([
  '0000',
  '1111',
  '2222',
  '3333',
  '4444',
  '5555',
  '6666',
  '7777',
  '8888',
  '9999',
  '1234',
  '4321',
]);

/**
 * Rejects trivially guessable 4-digit PINs during signup (§7.2).
 */
export function isWeakPin(pin: string): boolean {
  if (!/^\d{4}$/.test(pin)) return true;
  return WEAK_PINS.has(pin);
}
