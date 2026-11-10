import { randomUUID } from "node:crypto";
import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import { GeminiClient } from "./ai/gemini";
import { loadPrompts, type PromptStore } from "./ai/prompts";
import { registerAiRoutes } from "./ai/routes";
import { registerInternalHmac } from "./auth/internal-hmac";
import type { BridgeConfig } from "./config";
import { sendError, ValidationError } from "./http";
import { NexconnBridgeError, NexconnClient } from "./nexconn/client";
import { registerNexconnRoutes } from "./nexconn/routes";

export const SERVICE_NAME = "nexconn-bridge-node";

export async function buildApp(
  config: BridgeConfig,
  opts: { logger?: boolean; prompts?: PromptStore; gemini?: GeminiClient; nexconn?: NexconnClient } = {},
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: opts.logger ?? false,
    bodyLimit: 256 * 1024,
    genReqId: () => randomUUID().replace(/-/g, "").slice(0, 16),
  });

  const nc = opts.nexconn ?? new NexconnClient(config.nexconn);
  const gemini = opts.gemini ?? new GeminiClient(config.gemini);
  const prompts = opts.prompts ?? loadPrompts();

  await app.register(cors, { origin: config.corsOrigins });
  registerInternalHmac(app, config.internalHmacSecret);

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ValidationError) {
      return sendError(req, reply, 400, "ERR_VALIDATION", err.message, false, { mode: nc.mode });
    }
    if (err instanceof NexconnBridgeError) {
      req.log.warn({ code: err.code, upstream: err.upstreamStatus }, err.message);
      return sendError(req, reply, 502, err.code, err.message, err.retryable, { mode: nc.mode });
    }
    const status = (err as { statusCode?: number }).statusCode;
    if (status && status >= 400 && status < 500) {
      const code = (err as { code?: string }).code ?? "ERR_BAD_REQUEST";
      return sendError(req, reply, status, code, (err as Error).message, false, { mode: nc.mode });
    }
    req.log.error({ err }, "unhandled error");
    return sendError(req, reply, 500, "ERR_INTERNAL", "internal error", true, { mode: nc.mode });
  });

  app.setNotFoundHandler((req, reply) =>
    sendError(req, reply, 404, "ERR_NOT_FOUND", `no route ${req.method} ${req.url.split("?")[0]}`, false),
  );

  app.get("/health", async () => ({
    status: "ok",
    service: SERVICE_NAME,
    mode: nc.mode,
    ai_mode: gemini.enabled ? (gemini.breakerOpen() ? "heuristic-breaker-open" : "gemini") : "heuristic",
    internal_auth: config.internalHmacSecret ? "hmac-sha256" : "disabled",
    prompts: prompts.source,
    sdk: "@nexconn/server-sdk@0.1.2 (vendored)",
  }));

  registerNexconnRoutes(app, nc);
  registerAiRoutes(app, { config, gemini, prompts, ncMode: nc.mode, log: app.log });
  return app;
}
