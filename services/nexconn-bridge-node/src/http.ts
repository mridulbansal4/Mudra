import type { FastifyReply, FastifyRequest } from "fastify";
import { traceId } from "./auth/internal-hmac";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export type Body = Record<string, unknown>;

export function bodyOf(req: FastifyRequest): Body {
  const b = req.body;
  if (b && typeof b === "object" && !Array.isArray(b)) return b as Body;
  return {};
}

export function str(b: Body, key: string, opts: { required?: boolean; max?: number } = {}): string {
  const v = b[key];
  if (v === undefined || v === null || v === "") {
    if (opts.required !== false) throw new ValidationError(`'${key}' is required`);
    return "";
  }
  if (typeof v !== "string") throw new ValidationError(`'${key}' must be a string`);
  const max = opts.max ?? 4000;
  if (v.length > max) throw new ValidationError(`'${key}' exceeds ${max} characters`);
  return v;
}

export function optStr(b: Body, key: string, max = 4000): string | undefined {
  const v = str(b, key, { required: false, max });
  return v === "" ? undefined : v;
}

export function strArray(b: Body, key: string, opts: { required?: boolean; max?: number } = {}): string[] {
  const v = b[key];
  if (v === undefined || v === null) {
    if (opts.required === false) return [];
    throw new ValidationError(`'${key}' is required`);
  }
  if (!Array.isArray(v) || !v.every((x) => typeof x === "string" && x.length > 0)) {
    throw new ValidationError(`'${key}' must be an array of non-empty strings`);
  }
  if (v.length > (opts.max ?? 1000)) throw new ValidationError(`'${key}' has too many entries`);
  return v as string[];
}

export function num(b: Body, key: string, opts: { required?: boolean } = {}): number | undefined {
  const v = b[key];
  if (v === undefined || v === null) {
    if (opts.required === false) return undefined;
    throw new ValidationError(`'${key}' is required`);
  }
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isFinite(n)) throw new ValidationError(`'${key}' must be a number`);
  return n;
}

export function obj(b: Body, key: string): Record<string, unknown> {
  const v = b[key];
  if (v === undefined || v === null) return {};
  if (typeof v !== "object" || Array.isArray(v)) throw new ValidationError(`'${key}' must be an object`);
  return v as Record<string, unknown>;
}

export function sendError(
  req: FastifyRequest,
  reply: FastifyReply,
  status: number,
  code: string,
  message: string,
  retryable: boolean,
  extra: Record<string, unknown> = {},
) {
  return reply.code(status).send({ error: { code, message, trace_id: traceId(req), retryable }, ...extra });
}
