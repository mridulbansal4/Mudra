import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import i18n, { detectDeviceLocale } from '@/i18n';
import { getDefaultCountryCode } from '@/lib/phone';
import type {
  DraftListing,
  ListingCategory,
  ListingCondition,
  ListingKind,
  LocaleCode,
  Me,
  PrimaryRole,
  RoleMode,
} from '@/types';

const TOKEN_KEY = 'mudra_session_token';
const ME_KEY = 'mudra_me';
const MODE_KEY = 'mudra_mode';
const LOCALE_KEY = 'mudra_locale';
const COACHMARK_KEY = 'mudra_coachmark_dismissed';
const DRAFT_LISTING_KEY = 'draft-listing';

export type DraftListingData = DraftListing;

export interface SignupDraft {
  name: string;
  role: PrimaryRole;
  countryCode: string;
  nationalPhone: string;
  phoneE164: string;
  campus: string;
}

const initialSignupDraft = (): SignupDraft => ({
  name: '',
  role: 'both',
  countryCode: getDefaultCountryCode(),
  nationalPhone: '',
  phoneE164: '',
  campus: '',
});

async function saveSecureToken(token: string | null): Promise<void> {
  try {
    if (token) {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  } catch {
    if (token) {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } else {
      await AsyncStorage.removeItem(TOKEN_KEY);
    }
  }
}

async function readSecureToken(): Promise<string | null> {
  try {
    const val = await SecureStore.getItemAsync(TOKEN_KEY);
    if (val) return val;
  } catch {
    // fallback to AsyncStorage
  }
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export interface SessionState {
  token: string | null;
  me: Me | null;
  mode: RoleMode;
  locale: LocaleCode;
  isGuest: boolean;
  hydrated: boolean;
  coachmarkDismissed: boolean;
  draftListing: DraftListingData | null;
  signupDraft: SignupDraft;

  hydrate: () => Promise<void>;
  setSession: (token: string, me: Me) => Promise<void>;
  login: (token: string, me: Me) => Promise<void>;
  updateMe: (me: Me) => Promise<void>;
  setMode: (mode: RoleMode) => Promise<void>;
  toggleMode: () => Promise<void>;
  setLocale: (locale: LocaleCode) => Promise<void>;
  enterGuestMode: () => Promise<void>;
  dismissCoachmark: () => Promise<void>;
  logout: () => Promise<void>;
  saveDraft: (draft: DraftListingData) => Promise<void>;
  clearDraft: () => Promise<void>;
  setSignupDraft: (patch: Partial<SignupDraft>) => void;
  resetSignupDraft: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  token: null,
  me: null,
  mode: 'buy',
  locale: detectDeviceLocale(),
  isGuest: false,
  hydrated: false,
  coachmarkDismissed: false,
  draftListing: null,
  signupDraft: initialSignupDraft(),

  hydrate: async () => {
    try {
      const [token, meRaw, modeRaw, localeRaw, coachRaw, draftRaw] = await Promise.all([
        readSecureToken(),
        AsyncStorage.getItem(ME_KEY),
        AsyncStorage.getItem(MODE_KEY),
        AsyncStorage.getItem(LOCALE_KEY),
        AsyncStorage.getItem(COACHMARK_KEY),
        AsyncStorage.getItem(DRAFT_LISTING_KEY),
      ]);

      let me: Me | null = null;
      if (meRaw) {
        try {
          me = JSON.parse(meRaw) as Me;
        } catch {
          me = null;
        }
      }

      let draftListing: DraftListingData | null = null;
      if (draftRaw) {
        try {
          draftListing = JSON.parse(draftRaw) as DraftListingData;
        } catch {
          draftListing = null;
        }
      }

      const resolvedLocale: LocaleCode =
        (localeRaw as LocaleCode) || me?.locale || detectDeviceLocale();
      const resolvedMode: RoleMode =
        modeRaw === 'sell' || modeRaw === 'buy'
          ? modeRaw
          : me?.primary_role === 'sell'
            ? 'sell'
            : 'buy';

      if (i18n.language !== resolvedLocale) {
        await i18n.changeLanguage(resolvedLocale);
      }

      set({
        token: token || null,
        me: token ? me : null,
        mode: resolvedMode,
        locale: resolvedLocale,
        coachmarkDismissed: coachRaw === '1',
        draftListing,
        hydrated: true,
      });
    } catch {
      set({ hydrated: true });
    }
  },

  setSession: async (token: string, me: Me) => {
    const initialMode: RoleMode = me.primary_role === 'sell' ? 'sell' : 'buy';
    const resolvedLocale: LocaleCode = me.locale || get().locale || 'en';

    if (i18n.language !== resolvedLocale) {
      await i18n.changeLanguage(resolvedLocale);
    }

    set({
      token,
      me,
      mode: initialMode,
      locale: resolvedLocale,
      isGuest: false,
    });

    await Promise.all([
      saveSecureToken(token),
      AsyncStorage.setItem(ME_KEY, JSON.stringify(me)),
      AsyncStorage.setItem(MODE_KEY, initialMode),
      AsyncStorage.setItem(LOCALE_KEY, resolvedLocale),
    ]);
  },

  login: async (token: string, me: Me) => {
    await get().setSession(token, me);
  },

  updateMe: async (me: Me) => {
    const prevLocale = get().locale;
    const nextLocale = me.locale || prevLocale;
    if (nextLocale !== prevLocale) {
      await i18n.changeLanguage(nextLocale);
      await AsyncStorage.setItem(LOCALE_KEY, nextLocale);
    }
    set({ me, locale: nextLocale });
    await AsyncStorage.setItem(ME_KEY, JSON.stringify(me));
  },

  setMode: async (mode: RoleMode) => {
    if (get().mode !== mode) {
      try {
        await Haptics.selectionAsync();
      } catch {
        // ignore haptics error on unsupported devices
      }
    }
    set({ mode });
    await AsyncStorage.setItem(MODE_KEY, mode);
  },

  toggleMode: async () => {
    const next: RoleMode = get().mode === 'buy' ? 'sell' : 'buy';
    await get().setMode(next);
  },

  setLocale: async (locale: LocaleCode) => {
    await i18n.changeLanguage(locale);
    set({ locale });
    await AsyncStorage.setItem(LOCALE_KEY, locale);
  },

  enterGuestMode: async () => {
    set({
      token: null,
      me: null,
      isGuest: true,
      mode: 'buy',
    });
    await saveSecureToken(null);
    await AsyncStorage.removeItem(ME_KEY);
  },

  dismissCoachmark: async () => {
    set({ coachmarkDismissed: true });
    await AsyncStorage.setItem(COACHMARK_KEY, '1');
  },

  logout: async () => {
    set({
      token: null,
      me: null,
      isGuest: false,
      mode: 'buy',
    });
    await Promise.all([saveSecureToken(null), AsyncStorage.removeItem(ME_KEY)]);
  },

  saveDraft: async (draft: DraftListingData) => {
    set({ draftListing: draft });
    await AsyncStorage.setItem(DRAFT_LISTING_KEY, JSON.stringify(draft));
  },

  clearDraft: async () => {
    set({ draftListing: null });
    await AsyncStorage.removeItem(DRAFT_LISTING_KEY);
  },

  setSignupDraft: (patch: Partial<SignupDraft>) => {
    set((s) => ({ signupDraft: { ...s.signupDraft, ...patch } }));
  },

  resetSignupDraft: () => {
    set({ signupDraft: initialSignupDraft() });
  },
}));
