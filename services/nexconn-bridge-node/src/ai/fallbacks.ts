/**
 * Deterministic heuristic fallbacks used when Gemini is not configured, times out,
 * or returns an invalid answer. They are intentionally useful on their own.
 */
import { createHash } from "node:crypto";
import { type ExtractedTerms, formatInr } from "./terms";

export type Lang = "en" | "hi" | "mr" | "ta";
export type ShopLocale = Lang | "hinglish";

export function baseLang(locale: string | undefined): Lang | undefined {
  const l = (locale ?? "").toLowerCase().split(/[-_]/)[0];
  return l === "en" || l === "hi" || l === "mr" || l === "ta" ? l : undefined;
}

// ---------------------------------------------------------------------------
// Translator: bargaining-phrase glossary (first variant per language is canonical output)
// ---------------------------------------------------------------------------
type Entry = Record<Lang, string[]>;
const GLOSSARY: Entry[] = [
  { en: ["I want to buy"], hi: ["मैं खरीदना चाहता हूँ", "मैं खरीदना चाहता हूं", "mujhe kharidna hai"], mr: ["मला विकत घ्यायचे आहे"], ta: ["நான் வாங்க விரும்புகிறேன்", "வாங்க விரும்புகிறேன்"] },
  { en: ["need", "required"], hi: ["चाहिए", "chahiye"], mr: ["हवे", "पाहिजे"], ta: ["தேவை"] },
  { en: ["and"], hi: ["और", "aur"], mr: ["आणि"], ta: ["மற்றும்"] },
  { en: ["what is the price", "how much is it", "how much"], hi: ["कीमत क्या है", "कितने का है", "kitne ka hai", "kitna hai"], mr: ["किंमत काय आहे", "किती आहे"], ta: ["விலை என்ன", "எவ்வளவு"] },
  { en: ["too expensive", "very expensive"], hi: ["बहुत महंगा है", "बहुत महंगा", "bahut mehenga", "bahut mehnga"], mr: ["खूप महाग आहे", "खूप महाग"], ta: ["மிகவும் விலை அதிகம்", "விலை அதிகம்"] },
  { en: ["final price", "best price", "final rate"], hi: ["आखिरी कीमत", "फाइनल रेट", "final rate", "aakhri daam", "akhri daam"], mr: ["अंतिम किंमत", "फायनल रेट"], ta: ["இறுதி விலை"] },
  { en: ["last offer"], hi: ["आखिरी ऑफर", "last offer"], mr: ["शेवटची ऑफर"], ta: ["கடைசி சலுகை"] },
  { en: ["discount"], hi: ["छूट", "डिस्काउंट", "discount"], mr: ["सवलत"], ta: ["தள்ளுபடி"] },
  { en: ["deal done", "it's a deal", "deal is done"], hi: ["सौदा पक्का", "deal pakki", "deal pakka"], mr: ["व्यवहार पक्का", "सौदा पक्का"], ta: ["ஒப்பந்தம் உறுதி"] },
  { en: ["agreed", "okay"], hi: ["ठीक है", "मंज़ूर", "मंजूर", "theek hai", "thik hai"], mr: ["ठीक आहे", "मान्य"], ta: ["சரி", "ஒப்புக்கொள்கிறேன்"] },
  { en: ["not possible"], hi: ["संभव नहीं", "नहीं हो सकता", "nahi hoga", "nahi ho sakta"], mr: ["शक्य नाही"], ta: ["முடியாது"] },
  { en: ["live video test", "video test"], hi: ["लाइव वीडियो टेस्ट", "वीडियो टेस्ट", "video test"], mr: ["व्हिडिओ चाचणी"], ta: ["வீடியோ சோதனை"] },
  { en: ["warranty"], hi: ["वारंटी", "warranty"], mr: ["वॉरंटी"], ta: ["வாரண்டி"] },
  { en: ["months"], hi: ["महीने", "mahine"], mr: ["महिने"], ta: ["மாதம்", "மாத"] },
  { en: ["days"], hi: ["दिन", "din"], mr: ["दिवस"], ta: ["நாட்கள்"] },
  { en: ["machine"], hi: ["मशीन", "machine"], mr: ["मशीन"], ta: ["இயந்திரம்", "இயந்திரத்தை"] },
  { en: ["delivery", "shipping"], hi: ["डिलीवरी", "delivery"], mr: ["डिलिव्हरी"], ta: ["டெலிவரி"] },
  { en: ["payment"], hi: ["भुगतान", "पेमेंट", "payment"], mr: ["पेमेंट"], ta: ["பணம் செலுத்துதல்"] },
  { en: ["escrow"], hi: ["एस्क्रो", "escrow"], mr: ["एस्क्रो"], ta: ["எஸ்க்ரோ"] },
  { en: ["thank you", "thanks"], hi: ["धन्यवाद", "शुक्रिया", "shukriya", "dhanyavaad"], mr: ["धन्यवाद"], ta: ["நன்றி"] },
  { en: ["brother"], hi: ["भाई", "भैया", "bhai", "bhaiya"], mr: ["भाऊ"], ta: ["அண்ணா"] },
  { en: ["brand new"], hi: ["बिल्कुल नया", "ekdum naya"], mr: ["अगदी नवीन"], ta: ["புத்தம் புதியது"] },
  { en: ["second hand", "used"], hi: ["सेकंड हैंड", "पुराना"], mr: ["जुने"], ta: ["பழையது"] },
  { en: ["send photos"], hi: ["फोटो भेजो", "photo bhejo"], mr: ["फोटो पाठवा"], ta: ["புகைப்படங்கள் அனுப்பவும்"] },
  { en: ["today"], hi: ["आज", "aaj"], mr: ["आज"], ta: ["இன்று"] },
  { en: ["tomorrow"], hi: ["कल", "kal"], mr: ["उद्या"], ta: ["நாளை"] },
  { en: ["price", "rate"], hi: ["कीमत", "दाम", "daam"], mr: ["किंमत"], ta: ["விலை"] },
  { en: ["yes"], hi: ["हाँ", "हां", "haan"], mr: ["हो"], ta: ["ஆம்"] },
  { en: ["no"], hi: ["नहीं", "nahi"], mr: ["नाही"], ta: ["இல்லை"] },
];

const LABELS: Record<Lang, { offer: string; warranty: string; months: string; days: string }> = {
  en: { offer: "Offer", warranty: "warranty", months: "months", days: "days" },
  hi: { offer: "प्रस्ताव", warranty: "वारंटी", months: "महीने", days: "दिन" },
  mr: { offer: "प्रस्ताव", warranty: "वॉरंटी", months: "महिने", days: "दिवस" },
  ta: { offer: "சலுகை", warranty: "வாரண்டி", months: "மாதம்", days: "நாட்கள்" },
};

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const glossaryCache = new Map<string, { re: RegExp; map: Map<string, string> }>();

function glossaryFor(src: Lang, dst: Lang) {
  const key = `${src}>${dst}`;
  const hit = glossaryCache.get(key);
  if (hit) return hit;
  const map = new Map<string, string>();
  for (const e of GLOSSARY) for (const v of e[src]) map.set(v.toLowerCase(), e[dst][0]!);
  const alts = [...map.keys()].sort((a, b) => b.length - a.length).map(escapeRe);
  // Unicode-aware word boundaries (JS \b is ASCII-only and breaks on Indic scripts).
  const re = new RegExp(`(?<![\\p{L}\\p{M}])(?:${alts.join("|")})(?![\\p{L}\\p{M}])`, "giu");
  const built = { re, map };
  glossaryCache.set(key, built);
  return built;
}

export interface OfflineTranslation {
  translated_text: string;
  glossary_hits: number;
  model: string;
}

export function translateOffline(
  text: string,
  sourceLocale: string,
  targetLocale: string,
  terms: ExtractedTerms,
): OfflineTranslation {
  const src = baseLang(sourceLocale);
  const dst = baseLang(targetLocale);
  if (src && dst && src === dst) return { translated_text: text, glossary_hits: 0, model: "passthrough" };

  let hits = 0;
  let body = text;
  if (src && dst) {
    const g = glossaryFor(src, dst);
    body = text.replace(g.re, (m) => {
      const out = g.map.get(m.toLowerCase());
      if (out === undefined) return m;
      hits++;
      return out;
    });
  }

  // Terms tail in the target language so the reader always gets the commercial facts.
  const L = LABELS[dst ?? "en"];
  const tail: string[] = [];
  if (terms.offered_amount_paise !== undefined) tail.push(`${L.offer} ${formatInr(terms.offered_amount_paise)}`);
  if (terms.required_rpm !== undefined) tail.push(`${terms.required_rpm} RPM`);
  if (terms.warranty_months !== undefined) {
    tail.push(
      terms.warranty_days !== undefined
        ? `${L.warranty} ${terms.warranty_days} ${L.days}`
        : `${L.warranty} ${terms.warranty_months} ${L.months}`,
    );
  }
  const tag = `[${targetLocale || "und"} · offline]`;
  const translated = `${tag} ${body}${tail.length ? `, ${tail.join(" · ")}` : ""}`;
  return { translated_text: translated, glossary_hits: hits, model: "heuristic-glossary-v1" };
}

// ---------------------------------------------------------------------------
// Tribunal: split from pHash Hamming distance, reason code and motor RPM
// ---------------------------------------------------------------------------
export interface TribunalInput {
  deal_title: string;
  amount_paise: number;
  reason_code: string;
  description: string;
  hamming_distance: number;
  rpm_peak?: number;
  nominal_rpm?: number;
}

export interface TribunalResult {
  summary: string;
  buyer_refund_bps: number;
  seller_payout_bps: number;
  rationale: string;
}

const round50 = (n: number) => Math.round(n / 50) * 50;
const clampBps = (n: number) => Math.min(10000, Math.max(0, round50(n)));

export function tribunalHeuristic(input: TribunalInput): TribunalResult {
  const h = Math.max(0, Math.min(64, Math.round(input.hamming_distance)));
  const nominal = input.nominal_rpm && input.nominal_rpm > 0 ? input.nominal_rpm : 4800;
  const reason = input.reason_code.toUpperCase();

  let band: string;
  let bps: number;
  if (h <= 4) [band, bps] = ["the delivered unit is visually identical to the pre-shipment assay", 0];
  else if (h <= 10) [band, bps] = ["only minor cosmetic or transit changes are visible", 1200];
  else if (h <= 20) [band, bps] = ["visible physical damage occurred after the pre-shipment assay", 3500];
  else if (h <= 32) [band, bps] = ["major physical damage is evident against the pre-shipment assay", 6500];
  else [band, bps] = ["the delivered item does not match the pre-shipment assay (likely a different unit)", 10000];

  const notes: string[] = [];
  if (/NOT_RECEIVED|NOT_DELIVERED|NON_DELIVERY|MISSING/.test(reason)) {
    bps = 10000;
    notes.push("non-delivery claims default to a full refund pending courier proof");
  } else if (/WRONG_ITEM|SWAP|COUNTERFEIT|FAKE/.test(reason)) {
    bps = Math.max(bps, h > 20 ? 10000 : 5000);
    notes.push("an item-mismatch claim raises the buyer share");
  } else if (/NOT_AS_DESCRIBED|MISREPRESENT|QUALITY/.test(reason)) {
    bps += 500;
    notes.push("a not-as-described claim adds a 5% rebate");
  } else if (/REMORSE|CHANGED_MIND|NO_LONGER/.test(reason)) {
    bps = Math.min(bps, 500);
    notes.push("buyer's remorse is not a product defect");
  } else if (/DAMAGE|TRANSIT|BROKEN/.test(reason)) {
    bps = Math.max(bps, 1000);
    notes.push("transit damage is shared as a repair rebate");
  }

  let rpmLine = "No post-delivery motor reading was submitted.";
  if (input.rpm_peak !== undefined && input.rpm_peak > 0) {
    const ratio = input.rpm_peak / nominal;
    if (ratio >= 0.95) {
      rpmLine = `The motor FFT peak of ${Math.round(input.rpm_peak)} RPM is within 5% of the ${nominal} RPM nominal, so the core unit works.`;
      if (bps < 10000 && !/NOT_RECEIVED|NOT_DELIVERED|WRONG_ITEM|SWAP/.test(reason)) bps = Math.min(bps, 1500);
    } else if (ratio >= 0.8) {
      rpmLine = `The motor FFT peak of ${Math.round(input.rpm_peak)} RPM is ${Math.round((1 - ratio) * 100)}% below the ${nominal} RPM nominal, indicating degraded performance.`;
      bps += 1500;
    } else {
      rpmLine = `The motor FFT peak of ${Math.round(input.rpm_peak)} RPM is far below the ${nominal} RPM nominal, indicating a functional motor fault.`;
      bps = Math.max(bps + 3000, 5000);
    }
  }

  const buyer = clampBps(bps);
  const seller = 10000 - buyer;
  const amount = Math.max(0, Math.round(input.amount_paise));
  const refundPaise = Math.round((amount * buyer) / 10000);
  const summary =
    `The pre-shipment vs post-delivery pHash Hamming distance is ${h}/64, so ${band}. ${rpmLine} ` +
    `Recommended settlement: ${(buyer / 100).toFixed(buyer % 100 ? 1 : 0)}% (${formatInr(refundPaise)}) refunded to PARTY_BUYER and ` +
    `${(seller / 100).toFixed(seller % 100 ? 1 : 0)}% (${formatInr(amount - refundPaise)}) released to PARTY_SELLER, subject to arbitrator sign-off.`;
  const rationale =
    `Deterministic tribunal rubric: Hamming band → ${h <= 4 ? 0 : h <= 10 ? 1200 : h <= 20 ? 3500 : h <= 32 ? 6500 : 10000} bps` +
    `${notes.length ? `; ${notes.join("; ")}` : ""}; motor reading ${input.rpm_peak !== undefined ? "applied" : "absent"}. ` +
    `Decided on measurements only (reason code ${reason || "UNSPECIFIED"}); the free-text description is treated as an unverified claim.`;
  return { summary, buyer_refund_bps: buyer, seller_payout_bps: seller, rationale };
}

// ---------------------------------------------------------------------------
// Shopkeeper: Chanakya-style templated replies (price decided by Go; we only phrase it)
// ---------------------------------------------------------------------------
export interface ShopkeeperInput {
  item_title: string;
  sticker_price_paise: number;
  counter_offer_paise: number;
  accepted: boolean;
  offered_amount_paise: number;
  message_text: string;
  locale: string;
}

export function shopLocale(locale: string, message: string): ShopLocale {
  const l = (locale || "en").toLowerCase();
  if (l.includes("hinglish") || l === "hi-latn" || l.startsWith("hi-latn")) return "hinglish";
  const b = baseLang(l) ?? "en";
  if (b === "hi" && message && !/[ऀ-ॿ]/.test(message) && /[a-z]/i.test(message)) return "hinglish";
  return b;
}

type Tpl = { counter: string[]; accepted: string[]; react: Record<"student" | "upi" | "scratch" | "bulk", string> };
const SHOP: Record<ShopLocale, Tpl> = {
  en: {
    counter: [
      "{react}Arre, {item} for {offer}? My chai bill is bigger than that margin! Best I can do is {counter}, Chanakya's word.",
      "{react}{offer} for {item}? You bargain like a true Bengaluru pro! My final for this round: {counter}.",
      "{react}Hmm, {offer} is respectable, but this {item} is pure gold. Come up to {counter} and we shake hands.",
    ],
    accepted: [
      "Shabash! {offer} it is, the {item} is yours. Lock the escrow before I change my mind!",
      "You win this round, champion! {item} at {offer}, deal done. Lock it in escrow now.",
    ],
    react: {
      student: "Student? Respect for studies! ",
      upi: "Instant UPI is music to my ears, ",
      scratch: "A tiny scratch on the box doesn't touch the motor! ",
      bulk: "Bulk order? Now we're talking business! ",
    },
  },
  hi: {
    counter: [
      "{react}अरे भाई, {item} {offer} में? इतने में तो पैकिंग भी नहीं आती! मेरा भाव है {counter}, चाणक्य का वचन।",
      "{react}{offer}? बढ़िया मोलभाव! पर इस राउंड में मेरा आखिरी दाम {counter} है।",
      "{react}हम्म, {offer} ठीक है, पर {item} एकदम खरा माल है। {counter} पर हाथ मिलाइए।",
    ],
    accepted: [
      "शाबाश! {offer} पर सौदा पक्का, {item} आपका हुआ। मेरा मन बदलने से पहले एस्क्रो लॉक कीजिए!",
      "आप जीत गए! {item} {offer} में, सौदा पक्का। अभी एस्क्रो लॉक करें।",
    ],
    react: {
      student: "विद्यार्थी हो? पढ़ाई की इज़्ज़त है! ",
      upi: "तुरंत UPI की बात अच्छी लगी, ",
      scratch: "डिब्बे पर हल्की खरोंच से मोटर पर फर्क नहीं पड़ता! ",
      bulk: "थोक में? अब हुई धंधे की बात! ",
    },
  },
  hinglish: {
    counter: [
      "{react}Arre bhai, {item} sirf {offer} mein? Itne mein toh packing bhi nahi aati! Mera rate hai {counter}, Chanakya ka vachan.",
      "{react}{offer}? Badhiya mol-bhav! Par is round mein mera aakhri daam {counter} hai.",
      "{react}Hmm, {offer} theek hai, par {item} ekdum khara maal hai. {counter} pe haath milao.",
    ],
    accepted: [
      "Shabash! {offer} pe deal pakki, {item} aapka hua. Escrow lock karo jaldi!",
      "Aap jeet gaye boss! {item} {offer} mein, deal done. Abhi escrow lock karo.",
    ],
    react: {
      student: "Student ho? Padhai ki izzat hai! ",
      upi: "Instant UPI sunke dil khush hua, ",
      scratch: "Box pe chhoti si scratch se motor pe farak nahi padta! ",
      bulk: "Bulk mein? Ab hui dhande ki baat! ",
    },
  },
  mr: {
    counter: [
      "{react}अहो, {item} फक्त {offer} मध्ये? एवढ्यात तर पॅकिंगसुद्धा येत नाही! माझा भाव {counter}, चाणक्याचा शब्द.",
      "{react}{offer}? छान घासाघीस! पण या फेरीत माझी शेवटची किंमत {counter} आहे.",
      "{react}हम्म, {offer} ठीक आहे, पण {item} अस्सल माल आहे. {counter} वर हात मिळवा.",
    ],
    accepted: [
      "शाब्बास! {offer} वर व्यवहार पक्का, {item} तुमचा झाला. एस्क्रो लगेच लॉक करा!",
      "तुम्ही जिंकलात! {item} {offer} मध्ये, सौदा पक्का. आता एस्क्रो लॉक करा.",
    ],
    react: {
      student: "विद्यार्थी आहात? शिक्षणाचा मान आहे! ",
      upi: "लगेच UPI ऐकून बरं वाटलं, ",
      scratch: "खोक्यावरच्या ओरखड्याने मोटरला काही होत नाही! ",
      bulk: "घाऊक? आता झाली धंद्याची गोष्ट! ",
    },
  },
  ta: {
    counter: [
      "{react}அண்ணா, {item} வெறும் {offer}-க்கா? அந்த விலைக்கு பேக்கிங் கூட வராது! என் விலை {counter}, சாணக்கியர் வாக்கு.",
      "{react}{offer}? நல்ல பேரம்! ஆனால் இந்த சுற்றில் என் கடைசி விலை {counter}.",
      "{react}ம்ம், {offer} பரவாயில்லை, ஆனால் இந்த {item} அசல் சரக்கு. {counter}-க்கு கை குலுக்குவோம்.",
    ],
    accepted: [
      "சபாஷ்! {offer}-க்கு ஒப்பந்தம் உறுதி, {item} உங்களுடையது. உடனே எஸ்க்ரோவை லாக் செய்யுங்கள்!",
      "நீங்கள் வென்றீர்கள்! {item} {offer}-க்கு, ஒப்பந்தம் முடிந்தது. இப்போதே எஸ்க்ரோ லாக் செய்யுங்கள்.",
    ],
    react: {
      student: "மாணவரா? படிப்புக்கு மரியாதை! ",
      upi: "உடனடி UPI கேட்டு சந்தோஷம், ",
      scratch: "பெட்டியில் சிறு கீறல் மோட்டாரை பாதிக்காது! ",
      bulk: "மொத்தமாகவா? இப்போ தான் வியாபாரம் பேசுகிறோம்! ",
    },
  },
};

function reactionKey(msg: string): keyof Tpl["react"] | undefined {
  const m = msg.toLowerCase();
  if (/student|college|छात्र|विद्यार्थी|மாணவ/.test(m)) return "student";
  if (/upi|cash|gpay|phonepe|paytm|नकद|रोख|ரொக்க/.test(m)) return "upi";
  if (/scratch|dent|damage|खरोंच|ओरखड|டேமேஜ்|கீறல்/.test(m)) return "scratch";
  if (/bulk|wholesale|थोक|घाऊक|மொத்த/.test(m)) return "bulk";
  return undefined;
}

export function shopkeeperTemplate(input: ShopkeeperInput): { reply_text: string; locale: ShopLocale } {
  const loc = shopLocale(input.locale, input.message_text);
  const t = SHOP[loc];
  const pool = input.accepted ? t.accepted : t.counter;
  const h = createHash("sha256").update(`${input.message_text}|${input.offered_amount_paise}`).digest();
  const tpl = pool[h[0]! % pool.length]!;
  const rk = reactionKey(input.message_text);
  const item = input.item_title.replace(/[<>{}]/g, "").slice(0, 80) || "maal";
  const reply = tpl
    .replace("{react}", rk ? t.react[rk] : "")
    .replace(/\{item\}/g, item)
    .replace(/\{offer\}/g, formatInr(input.offered_amount_paise))
    .replace(/\{counter\}/g, formatInr(input.counter_offer_paise))
    .replace(/\{sticker\}/g, formatInr(input.sticker_price_paise));
  return { reply_text: reply, locale: loc };
}
