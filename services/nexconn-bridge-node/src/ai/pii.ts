import { signInternalRequest } from "../auth/internal-hmac";

export const PII_TOKEN = "[REDACTED_DPDP_PII]";

export type PiiCategory = "PHONE" | "AADHAAR" | "PAN" | "UPI" | "IFSC" | "EMAIL";

export interface ScrubResult {
  scrubbed_text: string;
  redacted_count: number;
  categories: PiiCategory[];
  engine: "rust" | "node-fallback";
  scrub_time_us: number;
}

// Order matters: EMAIL before UPI (both contain '@'), AADHAAR (12 digits) before PHONE (10 digits).
const RULES: Array<[PiiCategory, RegExp]> = [
  ["EMAIL", /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g],
  ["UPI", /(?<![\w.@-])[A-Za-z0-9._-]{2,256}@[A-Za-z][A-Za-z0-9]{1,63}(?![\w.@-])/g],
  ["PAN", /(?<![A-Za-z0-9])[A-Z]{5}[0-9]{4}[A-Z](?![A-Za-z0-9])/g],
  ["IFSC", /(?<![A-Za-z0-9])[A-Z]{4}0[A-Z0-9]{6}(?![A-Za-z0-9])/g],
  // digit guards: no adjacent digit, and not part of a grouped number like "1,45,000" / "12.50"
  ["AADHAAR", /(?<!\d|\d[,.])[2-9]\d{3}[\s-]?\d{4}[\s-]?\d{4}(?!\d|[,.]\d)/g],
  ["PHONE", /(?<!\d|\d[,.])(?:(?:\+|00)91[\s-]?|0)?[6-9]\d{4}[\s-]?\d{5}(?!\d|[,.]\d)/g],
];

/** Pure-JS DPDP scrubber used when Rust :4003 is unreachable or slow. */
export function scrubPiiLocal(text: string): ScrubResult {
  const t0 = performance.now();
  let out = text;
  let count = 0;
  const cats = new Set<PiiCategory>();
  for (const [cat, re] of RULES) {
    out = out.replace(re, () => {
      count++;
      cats.add(cat);
      return PII_TOKEN;
    });
  }
  return {
    scrubbed_text: out,
    redacted_count: count,
    categories: [...cats],
    engine: "node-fallback",
    scrub_time_us: Math.round((performance.now() - t0) * 1000),
  };
}

export interface RustScrubOptions {
  rustUrl: string;
  timeoutMs: number;
  hmacSecret: string;
  fetchImpl?: typeof fetch;
}

/**
 * Calls Rust `POST /internal/scrub-pii` (HMAC-signed, 300 ms budget). Any failure - 
 * network, timeout, non-2xx, malformed body - falls back to the local scrubber.
 */
export async function scrubPii(text: string, opts: RustScrubOptions): Promise<ScrubResult> {
  if (!text) return { scrubbed_text: "", redacted_count: 0, categories: [], engine: "node-fallback", scrub_time_us: 0 };
  const body = JSON.stringify({ text });
  try {
    const res = await (opts.fetchImpl ?? fetch)(`${opts.rustUrl}/internal/scrub-pii`, {
      method: "POST",
      headers: { "content-type": "application/json", ...signInternalRequest(opts.hmacSecret, body) },
      body,
      signal: AbortSignal.timeout(opts.timeoutMs),
    });
    if (!res.ok) throw new Error(`rust scrub HTTP ${res.status}`);
    const j = (await res.json()) as Partial<ScrubResult>;
    if (typeof j.scrubbed_text !== "string") throw new Error("rust scrub: malformed response");
    // Defence in depth: run the local pass over Rust output too (cheap, catches gaps).
    const local = scrubPiiLocal(j.scrubbed_text);
    return {
      scrubbed_text: local.scrubbed_text,
      redacted_count: (Number(j.redacted_count) || 0) + local.redacted_count,
      categories: Array.from(new Set([...(j.categories ?? []), ...local.categories])) as PiiCategory[],
      engine: "rust",
      scrub_time_us: Number(j.scrub_time_us) || 0,
    };
  } catch {
    return scrubPiiLocal(text);
  }
}
