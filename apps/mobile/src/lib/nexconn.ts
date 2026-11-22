import { useEffect } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { create } from 'zustand';
import type { QueryClient } from '@tanstack/react-query';
import { NexconnCall, NexconnChat } from '../../modules/nexconn-chat';
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
  wireCallListeners();
}

function wireCallListeners() {
  NexconnCall.onCallReceived((e) => {
    const call = useNexconnCallStore.getState();
    if (call.phase === 'ringing' || call.phase === 'connected') return; // the SDK reports busy to the caller
    call.set({ phase: 'incoming', callId: e.callId, peerId: e.callerUserId, dealId: e.extra || null, note: null });
  });
  NexconnCall.onCallConnected((e) => {
    const call = useNexconnCallStore.getState();
    call.set({ phase: 'connected', callId: e.callId, peerId: e.remoteUserId ?? call.peerId, note: null });
  });
  NexconnCall.onCallEnded((e) => {
    const call = useNexconnCallStore.getState();
    if (call.phase === 'idle') return;
    if (call.callId && e.callId && call.callId !== e.callId) return;
    finishCall(callEndText(e.reason));
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
  if (useNexconnCallStore.getState().phase !== 'idle') {
    void NexconnCall.endCall().catch(() => {});
    resetCall();
  }
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

// ---------------------------------------------------------------------------
// 1:1 inspection video call over the Nexconn Android Call SDK.
// The call engine rides on the Chat SDK connection above, so calls are only
// offered while the chat status is 'live'.
// ---------------------------------------------------------------------------

export const NEXCONN_ANDROID_CALL_SDK = 'ai.nexconn.chat:call';

export type NexconnCallPhase = 'idle' | 'ringing' | 'incoming' | 'connected' | 'ended' | 'error';

interface NexconnCallState {
  phase: NexconnCallPhase;
  callId: string | null;
  /** Nexconn user ID of the other phone (m_<supabase id>). */
  peerId: string | null;
  dealId: string | null;
  /** Short line shown when a call ends or fails. */
  note: string | null;
  set: (patch: Partial<Omit<NexconnCallState, 'set'>>) => void;
}

export const useNexconnCallStore = create<NexconnCallState>((set) => ({
  phase: 'idle',
  callId: null,
  peerId: null,
  dealId: null,
  note: null,
  set: (patch) => set(patch),
}));

const CALL_NOTE_MS = 2500;
let callNoteTimer: ReturnType<typeof setTimeout> | null = null;

function resetCall() {
  if (callNoteTimer) clearTimeout(callNoteTimer);
  callNoteTimer = null;
  useNexconnCallStore.getState().set({ phase: 'idle', callId: null, peerId: null, dealId: null, note: null });
}

/** Shows why the call ended for a moment, then returns to idle. */
function finishCall(note: string, phase: 'ended' | 'error' = 'ended') {
  useNexconnCallStore.getState().set({ phase, note });
  if (callNoteTimer) clearTimeout(callNoteTimer);
  callNoteTimer = setTimeout(resetCall, CALL_NOTE_MS);
}

export function callEndText(reason: string): string {
  switch (reason) {
    case 'DECLINED':
      return 'call declined';
    case 'NO_ANSWER':
    case 'MISSED':
      return 'no answer';
    case 'CANCELED':
      return 'call cancelled';
    case 'BUSY_LINE_RINGING':
    case 'BUSY_LINE_WAIT':
      return 'line busy';
    case 'CONNECTION_ERROR':
    case 'REMOTE_CONNECTION_ERROR':
      return 'connection lost';
    case 'ENDED':
    case 'HANGUP_BY_OTHER_CLIENT':
      return 'call ended';
    default:
      return `call ended (${reason.toLowerCase().replace(/_/g, ' ')})`;
  }
}

/** Camera + microphone runtime permissions, asked right before a call starts or is accepted. */
export async function ensureCallPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  const res = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.CAMERA,
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  ]);
  return (
    res[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED &&
    res[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED
  );
}

/** True when a video call can be offered right now. */
export function canStartNexconnCall(): boolean {
  return useNexconnStore.getState().status === 'live' && NexconnCall.isReady();
}

/** Buyer starts a video call to the counterpart of a deal. Never throws. */
export async function startInspectionCall(counterpartSupabaseId: string, dealId: string): Promise<void> {
  const call = useNexconnCallStore.getState();
  if (call.phase === 'ringing' || call.phase === 'connected' || call.phase === 'incoming') return;
  if (!canStartNexconnCall()) {
    finishCall('Nexconn is not connected', 'error');
    return;
  }
  try {
    if (!(await ensureCallPermissions())) {
      finishCall('camera and microphone permission needed', 'error');
      return;
    }
    if (callNoteTimer) clearTimeout(callNoteTimer);
    const peerId = nexconnUserId(counterpartSupabaseId);
    call.set({ phase: 'ringing', callId: null, peerId, dealId, note: null });
    const callId = await NexconnCall.startVideoCall(peerId, dealId);
    const now = useNexconnCallStore.getState();
    if (now.phase === 'ringing' || now.phase === 'connected') now.set({ callId: now.callId ?? callId });
  } catch (e) {
    if (useNexconnCallStore.getState().phase === 'ringing') finishCall(errorText(e), 'error');
  }
}

/** Callee accepts the incoming call. Declines it when permissions are refused. Never throws. */
export async function acceptIncomingCall(): Promise<void> {
  const { phase, callId } = useNexconnCallStore.getState();
  if (phase !== 'incoming' || !callId) return;
  try {
    if (!(await ensureCallPermissions())) {
      await NexconnCall.endCall(callId).catch(() => false);
      finishCall('camera and microphone permission needed', 'error');
      return;
    }
    await NexconnCall.acceptCall(callId);
  } catch (e) {
    if (useNexconnCallStore.getState().phase === 'incoming') finishCall(errorText(e), 'error');
  }
}

export async function declineIncomingCall(): Promise<void> {
  const { callId } = useNexconnCallStore.getState();
  await NexconnCall.endCall(callId).catch(() => false);
  finishCall('call declined');
}

/** Hangs up the current call (or cancels a ringing one). Never throws. */
export async function hangUpCall(): Promise<void> {
  const { callId } = useNexconnCallStore.getState();
  await NexconnCall.endCall(callId).catch(() => false);
  // onCallEnded normally arrives first; this only covers a lost event.
  if (useNexconnCallStore.getState().phase !== 'ended') finishCall('call ended');
}
