import type { BridgeConfig } from "../config";

export class GeminiUnavailable extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiUnavailable";
  }
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
  promptFeedback?: { blockReason?: string };
}

/**
 * Minimal Gemini REST client (JSON response mode) with a timeout and a small
 * circuit breaker: 3 consecutive failures open the breaker for 30 s, during which
 * callers go straight to their deterministic fallback.
 */
export class GeminiClient {
  private failures = 0;
  private openUntil = 0;

  constructor(
    private readonly cfg: BridgeConfig["gemini"],
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  get enabled(): boolean {
    return this.cfg.enabled;
  }

  get flashModel(): string {
    return this.cfg.flashModel;
  }

  get proModel(): string {
    return this.cfg.proModel;
  }

  breakerOpen(now = Date.now()): boolean {
    return now < this.openUntil;
  }

  async generateJson<T>(args: {
    model: string;
    systemInstruction: string;
    userText: string;
    temperature?: number;
    maxOutputTokens?: number;
  }): Promise<T> {
    if (!this.cfg.enabled) throw new GeminiUnavailable("gemini key not configured");
    if (this.breakerOpen()) throw new GeminiUnavailable("gemini circuit breaker open");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(args.model)}:generateContent`;
    try {
      const res = await this.fetchImpl(url, {
        method: "POST",
        // key sent as header (equivalent to ?key=) so it never lands in URL/access logs
        headers: { "content-type": "application/json", "x-goog-api-key": this.cfg.apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: args.systemInstruction }] },
          contents: [{ role: "user", parts: [{ text: args.userText }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: args.temperature ?? 0.2,
            maxOutputTokens: args.maxOutputTokens ?? 1024,
          },
        }),
        signal: AbortSignal.timeout(this.cfg.timeoutMs),
      });
      if (!res.ok) throw new GeminiUnavailable(`gemini HTTP ${res.status}`);
      const j = (await res.json()) as GeminiResponse;
      if (j.promptFeedback?.blockReason) throw new GeminiUnavailable(`gemini blocked: ${j.promptFeedback.blockReason}`);
      const text = j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      const parsed = parseJsonLoose(text);
      if (parsed === undefined) throw new GeminiUnavailable("gemini returned non-JSON output");
      this.failures = 0;
      return parsed as T;
    } catch (err) {
      this.failures++;
      if (this.failures >= 3) {
        this.openUntil = Date.now() + 30_000;
        this.failures = 0;
      }
      if (err instanceof GeminiUnavailable) throw err;
      const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      throw new GeminiUnavailable(msg);
    }
  }
}

/** Parses a JSON object, tolerating ```json fences or leading prose. */
export function parseJsonLoose(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(t);
  } catch {
    const s = t.indexOf("{");
    const e = t.lastIndexOf("}");
    if (s >= 0 && e > s) {
      try {
        return JSON.parse(t.slice(s, e + 1));
      } catch {
        return undefined;
      }
    }
    return undefined;
  }
}
