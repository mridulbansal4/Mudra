import { useEffect } from 'react';
import { create } from 'zustand';
import type { QueryClient } from '@tanstack/react-query';
import { NexconnChat } from '../../modules/nexconn-chat';
import { ENV } from '@/config/env';
import { newIdemKey } from '@/lib/idem';

/**
 * Nexconn Chat session for the Android app.
 *
 * Flow: fetch a Nexconn access token from the Mudra deal engine
 * (POST /api/v1/auth/session, issued server-side with the Nexconn Server SDK),
 * then NCEngine.initialize -> NCEngine.connect through the native module.
 * Supabase stays the source of truth: every failure here only flips the
 * status to 'error' and never throws into the UI.
 */

export const NEXCONN_ANDROID_SDK = 'ai.nexconn.chat:chat';

export type NexconnStatus = 'offline' | 'connecting' | 'live' | 'error';

interface NexconnState {
  status: NexconnStatus;
  userId: string | null;
  sdkVersion: string | null;
  lastMessageId: string | null;
  lastStatusEvent: string | null;
  error: string | null;
  set: (patch: Partial<Omit<NexconnState, 'set'>>) => void;
}

export const useNexconnStore = create<NexconnState>((set) => ({
  status: 'offline',
  userId: null,
  sdkVersion: null,
  lastMessageId: null,
  lastStatusEvent: null,
  error: null,
  set: (patch) => set(patch),
}));

/** Both phones derive the same Nexconn user ID from the Supabase user ID. */
export function nexconnUserId(supabaseUserId: string): string {
  return `m_${supabaseUserId}`;
}

export interface NexconnSessionGrant {
  accessToken: string;
  appKey: string;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** Requests a live Nexconn access token for this user. Throws on any non-live answer. */
export async function requestNexconnToken(
  me: { id: string; name: string },
  fetchImpl: FetchLike = fetch
): Promise<NexconnSessionGrant> {
  const res = await fetchImpl(`${ENV.MUDRA_API_URL}/api/v1/auth/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': newIdemKey() },
    body: JSON.stringify({
      nexconn_user_id: nexconnUserId(me.id),
      display_name: (me.name || 'Mudra user').slice(0, 80),
      role: 'guest',
      preferred_locale: 'en-IN',
      client_platform: 'android',
    }),
  });
  if (!res.ok) throw new Error(`token endpoint HTTP ${res.status}`);
  const json = (await res.json()) as {
    nexconn?: { access_token?: string; app_key?: string; mode?: string };
  };
  const nc = json.nexconn;
  if (!nc?.access_token || !nc.app_key) throw new Error('token endpoint returned no Nexconn token');
  if (nc.mode !== 'live') throw new Error(`token endpoint mode is "${nc.mode}", expected "live"`);
  return { accessToken: nc.access_token, appKey: nc.app_key };
}

function errorText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

let activeUserId: string | null = null;
let listenersWired = false;

function wireListeners(queryClient: QueryClient) {
  if (listenersWired) return;
  listenersWired = true;
  NexconnChat.onConnectionStatus(({ status }) => {
    const store = useNexconnStore.getState();
    const patch: Partial<NexconnState> = { lastStatusEvent: status };
    if (status === 'CONNECTED') patch.status = 'live';
    else if (status === 'CONNECTING') patch.status = 'connecting';
    else if (status === 'TOKEN_INCORRECT' || status === 'CONN_USER_BLOCKED') patch.status = 'error';
    else if (store.status === 'live' || store.status === 'connecting') patch.status = 'offline';
    store.set(patch);
  });
  NexconnChat.onMessage((m) => {
    useNexconnStore.getState().set({ lastMessageId: m.messageId });
    // A counterpart wrote in a deal: refresh from Supabase now instead of waiting for the poll.
    queryClient.invalidateQueries({ queryKey: ['messages'] });
    queryClient.invalidateQueries({ queryKey: ['deals'] });
    queryClient.invalidateQueries({ queryKey: ['deal'] });
  });
}

export async function startNexconnSession(
  me: { id: string; name: string },
  queryClient: QueryClient
): Promise<void> {
  const store = useNexconnStore.getState();
  if (!NexconnChat.isAvailable()) {
    store.set({ status: 'offline', error: 'Nexconn native module not available on this platform' });
    return;
  }
  if (activeUserId === me.id) return;
  activeUserId = me.id;
  store.set({
    status: 'connecting',
    error: null,
    userId: nexconnUserId(me.id),
    sdkVersion: NexconnChat.sdkVersion(),
  });
  try {
    wireListeners(queryClient);
    const grant = await requestNexconnToken(me);
    if (activeUserId !== me.id) return;
    if (!NexconnChat.initialize(grant.appKey)) throw new Error('NCEngine.initialize failed (no context)');
    const connectedAs = await NexconnChat.connect(grant.accessToken);
    if (activeUserId !== me.id) return;
    useNexconnStore.getState().set({ status: 'live', userId: connectedAs, error: null });
  } catch (e) {
    if (activeUserId === me.id) {
      activeUserId = null;
      useNexconnStore.getState().set({ status: 'error', error: errorText(e) });
    }
  }
}

export function stopNexconnSession(): void {
  if (activeUserId === null) return;
  activeUserId = null;
  try {
    NexconnChat.disconnect();
  } catch {
    // ignore: disconnect is best effort
  }
  useNexconnStore.getState().set({ status: 'offline', userId: null, lastMessageId: null });
}

/** Sends a deal chat line to the counterpart over a Nexconn Direct channel. Never throws. */
export async function sendNexconnDirect(counterpartSupabaseId: string, body: string): Promise<string | null> {
  if (useNexconnStore.getState().status !== 'live') return null;
  try {
    const id = await NexconnChat.sendDirectText(nexconnUserId(counterpartSupabaseId), body);
    if (id) useNexconnStore.getState().set({ lastMessageId: id });
    return id;
  } catch (e) {
    useNexconnStore.getState().set({ error: errorText(e) });
    return null;
  }
}

/** Keeps the Nexconn session in step with the Supabase login. */
export function useNexconnSession(
  token: string | null,
  me: { id: string; name: string } | null,
  queryClient: QueryClient
): void {
  const meId = me?.id ?? null;
  const meName = me?.name ?? '';
  useEffect(() => {
    if (token && meId) {
      void startNexconnSession({ id: meId, name: meName }, queryClient);
    } else {
      stopNexconnSession();
    }
  }, [token, meId, meName, queryClient]);
}
