import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import type { LocaleCode } from '@/types';

import en from './en.json';
import hi from './hi.json';
import ta from './ta.json';
import mr from './mr.json';
import es from './es.json';

export interface LanguageOption {
  code: LocaleCode;
  label: string;
  nativeLabel: string;
  short: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'english', nativeLabel: 'english', short: 'EN' },
  { code: 'hi', label: 'hindi', nativeLabel: 'हिन्दी', short: 'HI' },
  { code: 'ta', label: 'tamil', nativeLabel: 'தமிழ்', short: 'TA' },
  { code: 'mr', label: 'marathi', nativeLabel: 'मराठी', short: 'MR' },
  { code: 'es', label: 'spanish', nativeLabel: 'español', short: 'ES' },
];

const SUPPORTED_LOCALES = new Set<LocaleCode>(['en', 'hi', 'ta', 'mr', 'es']);

export function detectDeviceLocale(): LocaleCode {
  try {
    const langCode = Localization.getLocales?.()?.[0]?.languageCode?.toLowerCase();
    if (langCode && SUPPORTED_LOCALES.has(langCode as LocaleCode)) {
      return langCode as LocaleCode;
    }
  } catch {
    // ignore localization errors
  }
  return 'en';
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      ta: { translation: ta },
      mr: { translation: mr },
      es: { translation: es },
    },
    lng: detectDeviceLocale(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });
}

export * from './quick';
export default i18n;
