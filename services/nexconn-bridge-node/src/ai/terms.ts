/**
 * Deterministic commercial-term extraction (works with or without Gemini).
 * Handles ₹ / Rs / INR amounts in Indian ("1,45,000") and western ("145,000") grouping,
 * "1.45 lakh" / "1.45 लाख" / "2 crore" / "45k", RPM figures, and warranty durations.
 */

export interface ExtractedTerms {
  offered_amount_paise?: number;
  currency?: "INR";
  required_rpm?: number;
  warranty_months?: number;
  warranty_days?: number;
  injection_attempt_detected?: boolean;
}

export interface AmountMatch {
  rupees: number;
  paise: number;
  index: number;
  raw: string;
}

const CUR_PREFIX = String.raw`(?<![\p{L}\p{M}])(?:₹|rs\.?|inr|rupees?)`;
const CUR_SUFFIX = String.raw`(?:rupees?|rs\.?|inr|/-|रुपये|रुपए|रुपया|रुपयांना|रुपये|ரூபாய்|ரூ)`;
const NUM = String.raw`(\d{1,3}(?:,\d{2,3})+|\d+)(?:\.(\d{1,2}))?`;
const SCALE_WORDS: Array<[RegExp, number]> = [
  [/^(?:lakhs?|lacs?|lac|l|लाख|लाखों|पेटी|लक्ष|லட்சம்|லட்ச)$/i, 100_000],
  [/^(?:crores?|cr|करोड़|करोड|कोटी|கோடி)$/i, 10_000_000],
  [/^(?:k|thousand|hazaar|hazar|हज़ार|हजार|ஆயிரம்)$/i, 1_000],
];
const SCALE_ALT = String.raw`(lakhs?|lacs?|lac|crores?|cr|thousand|hazaar|hazar|k|लाख|लाखों|पेटी|लक्ष|करोड़|करोड|कोटी|हज़ार|हजार|லட்சம்|லட்ச|கோடி|ஆயிரம்)`;

// Unicode-aware "not followed by a letter" guard (JS \b is ASCII-only).
const END = String.raw`(?![\p{L}\p{M}\d])`;

const RE_SCALED = new RegExp(String.raw`(?:${CUR_PREFIX}\s*)?(\d+(?:\.\d+)?)\s*${SCALE_ALT}${END}`, "giu");
const RE_PREFIXED = new RegExp(String.raw`${CUR_PREFIX}\s*${NUM}`, "giu");
const RE_SUFFIXED = new RegExp(String.raw`${NUM}\s*${CUR_SUFFIX}${END}`, "giu");

function scaleOf(word: string): number {
  for (const [re, mult] of SCALE_WORDS) if (re.test(word)) return mult;
  return 1;
}

function toNumber(intPart: string, frac?: string): number {
  const n = Number(intPart.replace(/,/g, ""));
  return frac ? n + Number(`0.${frac}`) : n;
}

/** All money mentions in text order (overlapping matches collapsed, scaled forms win). */
export function extractAmounts(text: string): AmountMatch[] {
  const found: AmountMatch[] = [];
  const taken: Array<[number, number]> = [];
  const overlaps = (s: number, e: number) => taken.some(([a, b]) => s < b && e > a);
  const push = (rupees: number, index: number, raw: string) => {
    if (!Number.isFinite(rupees) || rupees <= 0 || rupees > 1e11) return;
    if (overlaps(index, index + raw.length)) return;
    taken.push([index, index + raw.length]);
    found.push({ rupees, paise: Math.round(rupees * 100), index, raw });
  };

  for (const m of text.matchAll(RE_SCALED)) {
    const word = m[2]!;
    // bare "k"/"l"/"cr" only counts when a currency marker precedes it ("₹45k", not "4k video")
    if (/^(?:k|cr|l)$/i.test(word) && !/^(?:₹|rs|inr|rupee)/i.test(m[0])) continue;
    push(Number(m[1]) * scaleOf(word), m.index!, m[0]);
  }
  for (const m of text.matchAll(RE_PREFIXED)) push(toNumber(m[1]!, m[2]), m.index!, m[0]);
  for (const m of text.matchAll(RE_SUFFIXED)) push(toNumber(m[1]!, m[2]), m.index!, m[0]);
  return found.sort((a, b) => a.index - b.index);
}

const RE_RPM = /(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(?:k\s*)?(?:rpm|r\.p\.m\.?|आरपीएम|ஆர்பிஎம்)/iu;

export function extractRpm(text: string): number | undefined {
  const m = RE_RPM.exec(text);
  if (!m) return undefined;
  let n = Number(m[1]!.replace(/,/g, ""));
  if (/k\s*(?:rpm|r\.p\.m)/i.test(m[0])) n *= 1000;
  return Number.isFinite(n) && n > 0 && n < 1_000_000 ? Math.round(n) : undefined;
}

const RE_WARRANTY_WORD = /warrant(?:y|ee)|guarantee|वारंटी|वॉरंटी|गारंटी|हमी|வாரண்டி|உத்தரவாதம்/iu;
const RE_DURATION = new RegExp(
  String.raw`(\d+(?:\.\d+)?)\s*-?\s*(months?|mos?|mahine|mahina|महीने|महीना|महिने|महिना|மாத(?:ம்|ங்கள்)?|days?|din|दिन|दिवस|நாள்(?:கள்)?|years?|yrs?|saal|साल|वर्ष|वर्षे|ஆண்டு(?:கள்)?|வருட(?:ம்)?)`,
  "giu",
);

export function extractWarranty(text: string): { months: number; days?: number } | undefined {
  if (!RE_WARRANTY_WORD.test(text)) return undefined;
  const warrantyIdx = text.search(RE_WARRANTY_WORD);
  let best: { months: number; days?: number; dist: number } | undefined;
  for (const m of text.matchAll(RE_DURATION)) {
    const n = Number(m[1]);
    const unit = m[2]!.toLowerCase();
    let months: number;
    let days: number | undefined;
    if (/^(?:days?|din|दिन|दिवस|நாள்)/u.test(unit)) {
      days = n;
      months = Math.round((n / 30) * 10) / 10;
    } else if (/^(?:years?|yrs?|saal|साल|वर्ष|ஆண்டு|வருட)/u.test(unit)) {
      months = n * 12;
    } else {
      months = n;
    }
    const dist = Math.abs(m.index! - warrantyIdx);
    if (!best || dist < best.dist) best = { months, ...(days !== undefined ? { days } : {}), dist };
  }
  if (!best || best.months <= 0 || best.months > 120) return undefined;
  return best.days !== undefined ? { months: best.months, days: best.days } : { months: best.months };
}

const RE_INJECTION =
  /ignore\s+(?:all\s+|any\s+)?(?:previous|prior|above|earlier)\s+(?:instructions|prompts?|rules)|system\s+override|you\s+are\s+now|debug\s+mode|developer\s+mode|release\s+(?:the\s+)?escrow|set\s+offered_amount|\[\s*sys[-_ ]?voucher|<\/?\s*(?:system|untrusted_user_speech)/i;

export function detectInjection(text: string): boolean {
  return RE_INJECTION.test(text);
}

export function extractTerms(text: string): ExtractedTerms {
  const out: ExtractedTerms = {};
  const amounts = extractAmounts(text);
  if (amounts.length > 0) {
    out.offered_amount_paise = amounts[0]!.paise;
    out.currency = "INR";
  }
  const rpm = extractRpm(text);
  if (rpm !== undefined) out.required_rpm = rpm;
  const w = extractWarranty(text);
  if (w) {
    out.warranty_months = w.months;
    if (w.days !== undefined) out.warranty_days = w.days;
  }
  out.injection_attempt_detected = detectInjection(text);
  return out;
}

const inrFmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

/** 14500000 -> "₹1,45,000" */
export function formatInr(paise: number): string {
  return `₹${inrFmt.format(paise / 100)}`;
}
