import { createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

/** IMPLEMENTATION_CONTRACT §5 */
export const TS_HEADER = "x-internal-timestamp";
export const SIG_HEADER = "x-internal-signature";
export const MAX_SKEW_SEC = 300;

export function computeSignature(secret: string, timestamp: string, rawBody: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${rawBody}`, "utf8").digest("hex");
}

/** Headers for an outbound signed call (Node -> Rust). Empty object when no secret. */
export function signInternalRequest(
  secret: string,
  rawBody: string,
  nowSec: number = Math.floor(Date.now() / 1000),
): Record<string, string> {
  if (!secret) return {};
  const ts = String(nowSec);
  return {
    "X-Internal-Timestamp": ts,
    "X-Internal-Signature": computeSignature(secret, ts, rawBody),
  };
}

export type VerifyResult = { ok: true } | { ok: false; reason: string };

export function verifyInternalSignature(args: {
  secret: string;
  timestamp: string | undefined;
  signature: string | undefined;
  rawBody: string;
  nowSec?: number;
}): VerifyResult {
  const { secret, timestamp, signature, rawBody } = args;
  if (!secret) return { ok: true };
  if (!timestamp || !signature) return { ok: false, reason: "missing internal signature headers" };
  if (!/^\d{1,12}$/.test(timestamp)) return { ok: false, reason: "malformed timestamp" };
  const now = args.nowSec ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > MAX_SKEW_SEC) return { ok: false, reason: "timestamp skew exceeds 300s" };
  const sig = signature.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(sig)) return { ok: false, reason: "malformed signature" };
  const expected = Buffer.from(computeSignature(secret, timestamp, rawBody), "hex");
  const given = Buffer.from(sig, "hex");
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return { ok: false, reason: "bad signature" };
  }
  return { ok: true };
}

declare module "fastify" {
  interface FastifyRequest {
    rawBody?: string;
  }
}

/**
 * Keeps the raw JSON body (needed for HMAC) and enforces signatures on `/internal/*`
 * when `secret` is non-empty. `/health` stays open.
 */
export function registerInternalHmac(app: FastifyInstance, secret: string): void {
  app.addContentTypeParser("application/json", { parseAs: "string" }, (req, body, done) => {
    const raw = typeof body === "string" ? body : body.toString("utf8");
    (req as FastifyRequest).rawBody = raw;
    if (raw.trim() === "") return done(null, {});
    try {
      done(null, JSON.parse(raw));
    } catch {
      const err = new Error("Request body is not valid JSON") as Error & { statusCode: number; code: string };
      err.statusCode = 400;
      err.code = "ERR_BAD_JSON";
      done(err, undefined);
    }
  });

  app.addHook("preHandler", async (req: FastifyRequest, reply: FastifyReply) => {
    if (!secret) return;
    const path = req.url.split("?")[0] ?? "";
    if (!path.startsWith("/internal/")) return;
    const result = verifyInternalSignature({
      secret,
      timestamp: headerValue(req.headers[TS_HEADER]),
      signature: headerValue(req.headers[SIG_HEADER]),
      rawBody: req.rawBody ?? "",
    });
    if (!result.ok) {
      return reply.code(401).send({
        error: { code: "ERR_INTERNAL_AUTH", message: result.reason, trace_id: traceId(req), retryable: false },
      });
    }
  });
}

function headerValue(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export function traceId(req: FastifyRequest): string {
  const h = headerValue(req.headers["x-trace-id"]);
  return h && h.length < 128 ? h : `tr_${req.id}`;
}
