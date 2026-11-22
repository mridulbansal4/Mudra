import { supabase } from '@/lib/supabase';
import { MudraError, parseMudraError } from '@/lib/errors';
import { setServerNow } from '@/lib/time';
import { useSessionStore } from '@/state/session';

const NO_TOKEN_RPCS = new Set(['m_ping', 'm_signup', 'm_login']);

export interface RpcOptions {
  withToken?: boolean;
}

/**
 * Executes a `public.m_*` Postgres RPC via Supabase.
 * Automatically injects `p_token`, syncs `server_now` clock offset, and parses `MUDRA:<CODE>:<detail>` errors.
 */
export async function rpc<T = unknown>(
  fnName: string,
  args: Record<string, unknown> = {},
  options?: RpcOptions
): Promise<T> {
  const shouldInjectToken = options?.withToken ?? !NO_TOKEN_RPCS.has(fnName);
  const currentToken = useSessionStore.getState().token;

  const payload: Record<string, unknown> =
    fnName === 'm_ping'
      ? {}
      : shouldInjectToken
        ? { p_token: currentToken ?? null, ...args }
        : { ...args };

  let data: unknown;
  let error: unknown;

  try {
    const res = await supabase.rpc(fnName, payload);
    data = res.data;
    error = res.error;
  } catch (networkErr) {
    throw parseMudraError(networkErr);
  }

  if (error) {
    const parsed = parseMudraError(error);
    if (parsed.code === 'AUTH' && currentToken) {
      await useSessionStore.getState().logout();
    }
    throw parsed;
  }

  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (typeof obj.server_now === 'string') {
      setServerNow(obj.server_now);
    } else if (
      obj.me &&
      typeof obj.me === 'object' &&
      typeof (obj.me as Record<string, unknown>).server_now === 'string'
    ) {
      setServerNow((obj.me as Record<string, unknown>).server_now as string);
    }
  }

  return data as T;
}

export { MudraError, parseMudraError };
