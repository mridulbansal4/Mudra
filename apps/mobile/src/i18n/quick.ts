import type { DealState, LocaleCode } from '@/types';

export type QuickReplyKey =
  | 'still_available'
  | 'lowest_price'
  | 'where_meet'
  | 'show_live'
  | 'deal'
  | 'locked'
  | 'going_live'
  | 'thanks'
  | 'on_my_way';

export const QUICK_REPLY_KEYS: QuickReplyKey[] = [
  'still_available',
  'lowest_price',
  'where_meet',
  'show_live',
  'deal',
  'locked',
  'going_live',
  'thanks',
  'on_my_way',
];

/**
 * Pre-translated quick replies across all 5 supported languages (§9.4).
 * Zero network latency; receiver renders in their own locale.
 */
export const QUICK_REPLIES: Record<QuickReplyKey, Record<LocaleCode, string>> = {
  still_available: {
    en: 'is this still available?',
    hi: 'क्या यह अभी भी उपलब्ध है?',
    ta: 'இது இன்னும் கிடைக்குமா?',
    mr: 'हे अजून उपलब्ध आहे का?',
    es: '¿sigue disponible?',
  },
  lowest_price: {
    en: "what's your lowest price?",
    hi: 'आपकी सबसे कम कीमत क्या है?',
    ta: 'உங்கள் குறைந்த விலை என்ன?',
    mr: 'तुमची सर्वात कमी किंमत किती?',
    es: '¿cuál es tu precio más bajo?',
  },
  where_meet: {
    en: 'where can we meet?',
    hi: 'हम कहाँ मिल सकते हैं?',
    ta: 'நாம் எங்கே சந்திக்கலாம்?',
    mr: 'आपण कुठे भेटू शकतो?',
    es: '¿dónde nos vemos?',
  },
  show_live: {
    en: 'can you show it live?',
    hi: 'क्या आप इसे लाइव दिखा सकते हैं?',
    ta: 'இதை நேரலையில் காட்ட முடியுமா?',
    mr: 'तुम्ही हे लाइव्ह दाखवू शकता का?',
    es: '¿puedes mostrarlo en vivo?',
  },
  deal: {
    en: 'deal.',
    hi: 'डील पक्की।',
    ta: 'ஒப்பந்தம் சரி.',
    mr: 'डील पक्की.',
    es: 'trato hecho.',
  },
  locked: {
    en: "money's locked in escrow.",
    hi: 'पैसे एस्क्रो में लॉक हैं।',
    ta: 'பணம் எஸ்க்ரோவில் பூட்டப்பட்டது.',
    mr: 'पैसे एस्क्रोमध्ये लॉक आहेत.',
    es: 'el dinero está en garantía.',
  },
  going_live: {
    en: 'going live now.',
    hi: 'अभी लाइव आ रहा हूँ।',
    ta: 'இப்போது நேரலைக்கு வருகிறேன்.',
    mr: 'आता लाइव्ह येतो.',
    es: 'entro en vivo ahora.',
  },
  thanks: {
    en: 'thanks!',
    hi: 'धन्यवाद!',
    ta: 'நன்றி!',
    mr: 'धन्यवाद!',
    es: '¡gracias!',
  },
  on_my_way: {
    en: 'on my way.',
    hi: 'रास्ते में हूँ।',
    ta: 'வந்துகொண்டிருக்கிறேன்.',
    mr: 'निघालो आहे.',
    es: 'voy en camino.',
  },
};

export function getQuickReplyText(
  key: QuickReplyKey | string,
  locale: LocaleCode | string = 'en'
): string {
  const entry = QUICK_REPLIES[key as QuickReplyKey];
  if (!entry) return key;
  const loc = (locale?.toLowerCase() || 'en') as LocaleCode;
  return entry[loc] ?? entry.en;
}

/**
 * Returns contextual quick reply keys based on deal state and caller's role (§9.4).
 */
export function getContextualQuickKeys(
  state: DealState,
  myRole: 'buyer' | 'seller'
): QuickReplyKey[] {
  switch (state) {
    case 'OFFERED':
      return myRole === 'buyer'
        ? ['still_available', 'lowest_price', 'where_meet', 'deal']
        : ['where_meet', 'deal', 'going_live', 'thanks'];
    case 'CREATED':
    case 'FUNDED':
      return myRole === 'buyer'
        ? ['show_live', 'locked', 'where_meet', 'on_my_way']
        : ['going_live', 'where_meet', 'on_my_way', 'deal'];
    case 'INSPECTION_LIVE':
    case 'ASSAY_VERIFIED':
      return myRole === 'buyer'
        ? ['thanks', 'where_meet', 'on_my_way']
        : ['going_live', 'on_my_way', 'thanks'];
    default:
      return ['thanks', 'where_meet'];
  }
}
