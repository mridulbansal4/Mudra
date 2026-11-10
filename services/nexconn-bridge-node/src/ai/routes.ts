import type { FastifyInstance } from "fastify";
import type { BridgeConfig } from "../config";
import { bodyOf, num, optStr, str, ValidationError } from "../http";
import type { Mode } from "../nexconn/client";
import { shopkeeperTemplate, translateOffline, tribunalHeuristic } from "./fallbacks";
import { type GeminiClient, GeminiUnavailable } from "./gemini";
import { scrubPii, type ScrubResult } from "./pii";
import { type PromptStore, wrapUntrusted } from "./prompts";
import { type ExtractedTerms, extractAmounts, extractTerms, formatInr } from "./terms";

export interface AiDeps {
  config: BridgeConfig;
  gemini: GeminiClient;
  prompts: PromptStore;
  ncMode: Mode;
  log?: { warn: (obj: unknown, msg?: string) => void };
}

const TEXT_MAX = 4000;
const LOCALE_RE = /^[A-Za-z]{2,3}(?:[-_][A-Za-z0-9]{2,8}){0,2}$/;

function locale(b: Record<string, unknown>, key: string, def: string): string {
  const v = optStr(b, key, 20) ?? def;
  if (!LOCALE_RE.test(v)) throw new ValidationError(`'${key}' must be a BCP-47 style locale such as hi-IN`);
  return v;
}

const posInt = (v: unknown, max: number): number | undefined =>
  typeof v === "number" && Number.isFinite(v) && v > 0 && v <= max ? Math.round(v) : undefined;

const digitsOf = (s: string) => s.replace(/[^\d]/g, "");

export function registerAiRoutes(app: FastifyInstance, deps: AiDeps): void {
  const { config, gemini, prompts, ncMode } = deps;
  const scrub = (text: string): Promise<ScrubResult> =>
    scrubPii(text, { rustUrl: config.rust.url, timeoutMs: config.rust.scrubTimeoutMs, hmacSecret: config.internalHmacSecret });
  const warn = (err: unknown, what: string) =>
    deps.log?.warn({ err: err instanceof Error ? err.message : String(err) }, `${what}: falling back to heuristic`);

  // -------------------------------------------------------------------------- M-01
  app.post("/internal/ai/translate", async (req) => {
    const b = bodyOf(req);
    const text = str(b, "text", { max: TEXT_MAX });
    const source = locale(b, "source_locale", "en-IN");
    const target = locale(b, "target_locale", "hi-IN");

    const pii = await scrub(text);
    const clean = pii.scrubbed_text;
    const terms: ExtractedTerms = extractTerms(clean);
    let translated: string | undefined;
    let english: string | undefined;
    let model = "";
    let aiMode: "gemini" | "heuristic" = "heuristic";
    let fallbackReason: string | undefined;

    if (gemini.enabled) {
      try {
        const out = await gemini.generateJson<Record<string, unknown>>({
          model: gemini.flashModel,
          systemInstruction: prompts.render("m01-translator", { source_locale: source, target_locale: target }),
          userText: wrapUntrusted(clean),
          temperature: 0.1,
        });
        if (typeof out.translated_text !== "string" || !out.translated_text.trim()) {
          throw new GeminiUnavailable("model omitted translated_text");
        }
        translated = out.translated_text.trim();
        english = typeof out.english_text === "string" ? out.english_text.trim() : undefined;
        // Regex terms win (deterministic); model fills only what regex could not see (e.g. spelled-out numbers).
        terms.offered_amount_paise ??= posInt(out.offered_amount_paise, 1e13);
        terms.required_rpm ??= posInt(out.required_assay_rpm, 100_000);
        terms.warranty_months ??= posInt(out.warranty_months, 120);
        if (terms.offered_amount_paise !== undefined) terms.currency = "INR";
        if (out.injection_attempt_detected === true) terms.injection_attempt_detected = true;
        // Guarantee ₹ amounts survive verbatim even if the model reformatted them.
        const missing = extractAmounts(clean).filter((a) => !digitsOf(translated!).includes(digitsOf(a.raw)));
        if (missing.length) translated += ` (${missing.map((a) => a.raw.trim()).join(", ")})`;
        model = gemini.flashModel;
        aiMode = "gemini";
      } catch (err) {
        fallbackReason = err instanceof Error ? err.message : String(err);
        warn(err, "translate");
      }
    } else {
      fallbackReason = "GEMINI_API_KEY not configured";
    }

    let glossaryHits: number | undefined;
    if (translated === undefined) {
      const off = translateOffline(clean, source, target, terms);
      translated = off.translated_text;
      glossaryHits = off.glossary_hits;
      model = off.model;
    }

    for (const k of Object.keys(terms) as Array<keyof ExtractedTerms>) if (terms[k] === undefined) delete terms[k];
    return {
      translated_text: translated,
      ...(english ? { english_text: english } : {}),
      source_text_scrubbed: clean,
      source_locale: source,
      target_locale: target,
      extracted_terms: terms,
      injection_attempt_detected: terms.injection_attempt_detected === true,
      pii_redacted_count: pii.redacted_count,
      pii_categories: pii.categories,
      pii_engine: pii.engine,
      ...(glossaryHits !== undefined ? { glossary_hits: glossaryHits } : {}),
      model,
      ai_mode: aiMode,
      ...(fallbackReason ? { fallback_reason: fallbackReason } : {}),
      mode: ncMode,
    };
  });

  // -------------------------------------------------------------------------- M-04
  app.post("/internal/ai/tribunal", async (req) => {
    const b = bodyOf(req);
    const dealTitleRaw = str(b, "deal_title", { max: 200 });
    const amountPaise = num(b, "amount_paise")!;
    const reasonCode = (optStr(b, "reason_code", 64) ?? "UNSPECIFIED").toUpperCase().replace(/[^A-Z0-9_]/g, "_");
    const descriptionRaw = optStr(b, "description", TEXT_MAX) ?? "";
    const hamming = num(b, "hamming_distance")!;
    const rpmPeak = num(b, "rpm_peak", { required: false });
    const nominalRpm = num(b, "nominal_rpm", { required: false }) ?? num(b, "min_motor_rpm", { required: false });
    if (amountPaise < 0) throw new ValidationError("'amount_paise' must be >= 0");
    if (hamming < 0 || hamming > 64) throw new ValidationError("'hamming_distance' must be within 0..64");

    const [titlePii, descPii] = await Promise.all([scrub(dealTitleRaw), scrub(descriptionRaw)]);
    const input = {
      deal_title: titlePii.scrubbed_text,
      amount_paise: amountPaise,
      reason_code: reasonCode,
      description: descPii.scrubbed_text,
      hamming_distance: hamming,
      ...(rpmPeak !== undefined ? { rpm_peak: rpmPeak } : {}),
      ...(nominalRpm !== undefined ? { nominal_rpm: nominalRpm } : {}),
    };
    const heuristic = tribunalHeuristic(input);
    const piiCount = titlePii.redacted_count + descPii.redacted_count;
    const piiEngine = titlePii.engine === "rust" && descPii.engine === "rust" ? "rust" : "node-fallback";

    let fallbackReason: string | undefined = gemini.enabled ? undefined : "GEMINI_API_KEY not configured";
    if (gemini.enabled) {
      try {
        const out = await gemini.generateJson<Record<string, unknown>>({
          model: gemini.proModel,
          systemInstruction: prompts.render("m04-tribunal", {
            deal_title: input.deal_title,
            amount_paise: amountPaise,
            amount_inr: formatInr(amountPaise),
            reason_code: reasonCode,
            hamming_distance: hamming,
            rpm_peak: rpmPeak ?? "not measured",
            nominal_rpm: nominalRpm ?? 4800,
          }),
          userText: wrapUntrusted(input.description || "(no description provided)"),
          temperature: 0.2,
        });
        const buyer = out.buyer_refund_bps;
        const seller = out.seller_payout_bps;
        if (
          typeof out.summary !== "string" ||
          typeof buyer !== "number" ||
          !Number.isInteger(buyer) ||
          buyer < 0 ||
          buyer > 10000 ||
          (seller !== undefined && seller !== 10000 - buyer)
        ) {
          throw new GeminiUnavailable("tribunal output failed schema / bps-sum check");
        }
        return {
          summary: out.summary,
          buyer_refund_bps: buyer,
          seller_payout_bps: 10000 - buyer,
          rationale: typeof out.rationale === "string" ? out.rationale : "",
          heuristic_reference: { buyer_refund_bps: heuristic.buyer_refund_bps, seller_payout_bps: heuristic.seller_payout_bps },
          pii_redacted_count: piiCount,
          pii_engine: piiEngine,
          model: gemini.proModel,
          ai_mode: "gemini",
          requires_human_signoff: true,
          mode: ncMode,
        };
      } catch (err) {
        fallbackReason = err instanceof Error ? err.message : String(err);
        warn(err, "tribunal");
      }
    }
    return {
      ...heuristic,
      pii_redacted_count: piiCount,
      pii_engine: piiEngine,
      model: "heuristic-tribunal-v1",
      ai_mode: "heuristic",
      fallback_reason: fallbackReason,
      requires_human_signoff: true,
      mode: ncMode,
    };
  });

  // -------------------------------------------------------------------------- M-05
  app.post("/internal/ai/shopkeeper", async (req) => {
    const b = bodyOf(req);
    const input = {
      item_title: str(b, "item_title", { max: 200 }),
      sticker_price_paise: num(b, "sticker_price_paise")!,
      counter_offer_paise: num(b, "counter_offer_paise")!,
      accepted: b.accepted === true,
      offered_amount_paise: num(b, "offered_amount_paise")!,
      message_text: optStr(b, "message_text", TEXT_MAX) ?? "",
      locale: locale(b, "locale", "en-IN"),
    };
    for (const k of ["sticker_price_paise", "counter_offer_paise", "offered_amount_paise"] as const) {
      if (input[k] < 0) throw new ValidationError(`'${k}' must be >= 0`);
    }
    const pii = await scrub(input.message_text);
    const safe = { ...input, message_text: pii.scrubbed_text };
    const fallback = shopkeeperTemplate(safe);

    let fallbackReason: string | undefined = gemini.enabled ? undefined : "GEMINI_API_KEY not configured";
    if (gemini.enabled) {
      try {
        const out = await gemini.generateJson<Record<string, unknown>>({
          model: gemini.flashModel,
          systemInstruction: prompts.render("m05-shopkeeper", {
            item_title: safe.item_title,
            sticker_inr: formatInr(safe.sticker_price_paise),
            offered_inr: formatInr(safe.offered_amount_paise),
            counter_inr: formatInr(safe.counter_offer_paise),
            accepted: safe.accepted,
            locale: fallback.locale === "hinglish" ? "Hinglish (Hindi in Latin script)" : safe.locale,
          }),
          userText: wrapUntrusted(safe.message_text || "(player sent no message)"),
          temperature: 0.8,
          maxOutputTokens: 1024,
        });
        const reply = typeof out.reply_text === "string" ? out.reply_text.trim() : "";
        if (!reply || reply.length > 600) throw new GeminiUnavailable("shopkeeper reply missing or too long");
        // Go decides the price: every amount the model mentions must be one Go supplied,
        // and the decisive price (counter, or the accepted offer) must be present.
        const allowed = new Set([safe.counter_offer_paise, safe.offered_amount_paise, safe.sticker_price_paise]);
        const decisive = safe.accepted ? safe.offered_amount_paise : safe.counter_offer_paise;
        const mentioned = extractAmounts(reply).map((a) => a.paise);
        if (mentioned.some((p) => !allowed.has(p)) || !mentioned.includes(decisive)) {
          throw new GeminiUnavailable("shopkeeper reply stated a price Go did not decide");
        }
        return { reply_text: reply, pii_redacted_count: pii.redacted_count, model: gemini.flashModel, ai_mode: "gemini", mode: ncMode };
      } catch (err) {
        fallbackReason = err instanceof Error ? err.message : String(err);
        warn(err, "shopkeeper");
      }
    }
    return {
      reply_text: fallback.reply_text,
      reply_locale: fallback.locale,
      pii_redacted_count: pii.redacted_count,
      pii_engine: pii.engine,
      model: "heuristic-chanakya-templates-v1",
      ai_mode: "heuristic",
      fallback_reason: fallbackReason,
      mode: ncMode,
    };
  });
}
