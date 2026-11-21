import type { ApiError } from "@mudra/shared-types";

/** Requests go to `/api/*`, which Vite proxies to the Go gateway on :4002. */
const BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public retryable = false,
  ) {
    super(message);
  }
}

function newIdempotencyKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `idk_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

async function request<T>(method: string, path: string, body?: unknown, jwt?: string): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (jwt) headers.Authorization = `Bearer ${jwt}`;
  if (method === "POST") headers["X-Idempotency-Key"] = newIdempotencyKey();

  let res: Response;
  try {
    res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiRequestError(0, "ERR_GATEWAY_UNREACHABLE", "Deal engine on :4002 is not reachable. Start it with pnpm dev.", true);
  }
  const text = await res.text();
  let json: unknown = undefined;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    /* non-JSON body */
  }
  if (!res.ok) {
    const e = (json as ApiError | undefined)?.error;
    throw new ApiRequestError(res.status, e?.code ?? `HTTP_${res.status}`, e?.message ?? (text || res.statusText), e?.retryable ?? false);
  }
  return json as T;
}

export const api = {
  get: <T>(path: string, jwt?: string) => request<T>("GET", path, undefined, jwt),
  post: <T>(path: string, body: unknown, jwt?: string) => request<T>("POST", path, body, jwt),
};

export function errorText(e: unknown): string {
  if (e instanceof ApiRequestError) return `${e.message} (${e.code})`;
  if (e instanceof Error) return e.message;
  return String(e);
}
