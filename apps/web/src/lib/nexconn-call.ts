/**
 * 1:1 Nexconn video inspection call (@nexconn/call NCCallEngine) between buyer and seller.
 * Requires bootNexconn() to have connected (it installs and initializes the call engine).
 */
import type { NCCallEngine, NCCallMediaType, NCCallSession, NCCallType } from "@nexconn/call";
import { emitNexconnEvent, getCallEngine } from "./nexconn-boot";

const SINGLE = 0 as NCCallType;
const AUDIO_VIDEO = 1 as NCCallMediaType;
const OK = 0;

type Listeners = {
  incoming?: (s: NCCallSession) => void;
  connected?: (s: NCCallSession) => void;
  ended?: (s: NCCallSession) => void;
};
const listeners: Listeners = {};
let wiredEngine: NCCallEngine | null = null;

function engine(): NCCallEngine {
  const e = getCallEngine();
  if (!e) throw new Error("Nexconn Call SDK is not connected");
  if (wiredEngine !== e) {
    e.setCallEventHandler({
      onCallReceived: ({ session }) => {
        emitNexconnEvent({ kind: "call", phase: "incoming", callId: session.getCallId() });
        listeners.incoming?.(session);
      },
      onCallConnected: ({ session }) => {
        emitNexconnEvent({ kind: "call", phase: "connected", callId: session.getCallId() });
        listeners.connected?.(session);
      },
      onCallEnded: ({ session, reason }) => {
        emitNexconnEvent({ kind: "call", phase: "ended", callId: session.getCallId(), detail: String(reason) });
        listeners.ended?.(session);
      },
    });
    wiredEngine = e;
  }
  return e;
}

export const isCallReady = () => getCallEngine() !== null;

/** Buyer side: ring the seller and resolve once the call is connected and the remote video is bound. */
export async function startInspectionCall(opts: {
  calleeId: string;
  dealId: string;
  remoteVideo: HTMLVideoElement;
  localVideo?: HTMLVideoElement;
  timeoutMs?: number;
}): Promise<string> {
  const e = engine();
  // The buyer only watches; leaving the camera free lets the seller window use it on the same machine.
  if (opts.localVideo) e.setLocalVideoView({ videoElement: opts.localVideo });
  else await e.enableCamera(false).catch(() => undefined);
  const connected = new Promise<NCCallSession>((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error("seller did not answer in time")), opts.timeoutMs ?? 20000);
    listeners.connected = (s) => {
      window.clearTimeout(t);
      resolve(s);
    };
    listeners.ended = () => {
      window.clearTimeout(t);
      reject(new Error("call ended before connecting"));
    };
  });
  const res = await e.startCall({ calleeIds: [opts.calleeId], callType: SINGLE, mediaType: AUDIO_VIDEO, extra: opts.dealId });
  if (res.code !== OK || !res.callId) {
    emitNexconnEvent({ kind: "call", phase: "failed", detail: `startCall code ${res.code}` });
    throw new Error(`NCCallEngine.startCall failed with code ${res.code}`);
  }
  emitNexconnEvent({ kind: "call", phase: "ringing", callId: res.callId });
  e.setRemoteVideoView([{ userId: opts.calleeId, videoElement: opts.remoteVideo }]);
  try {
    await connected;
  } catch (err) {
    await e.endCall({ callId: res.callId }).catch(() => undefined);
    throw err;
  }
  void opts.remoteVideo.play().catch(() => undefined);
  return res.callId;
}

/** Seller side: accept every incoming inspection call and show local and remote video. */
export function answerIncomingCalls(opts: { localVideo: HTMLVideoElement; remoteVideo: HTMLVideoElement; onState?: (s: string) => void }): () => void {
  const e = engine();
  listeners.incoming = (session) => {
    opts.onState?.("Incoming call from the buyer, answering");
    e.setLocalVideoView({ videoElement: opts.localVideo });
    e.setRemoteVideoView([{ userId: session.getCallerUserId(), videoElement: opts.remoteVideo }]);
    void e.acceptCall({ callId: session.getCallId() }).then((r) => {
      if (r.code !== OK) opts.onState?.(`acceptCall failed with code ${r.code}`);
    });
  };
  listeners.connected = (session) => {
    e.setRemoteVideoView([{ userId: session.getCallerUserId(), videoElement: opts.remoteVideo }]);
    void opts.localVideo.play().catch(() => undefined);
    void opts.remoteVideo.play().catch(() => undefined);
    opts.onState?.(`Connected, call ${session.getCallId()}`);
  };
  listeners.ended = () => opts.onState?.("Call ended");
  return () => {
    listeners.incoming = undefined;
    listeners.connected = undefined;
    listeners.ended = undefined;
  };
}

/** Seller session handed from the sandbox tab to the /call/seller window (same origin, never in the URL). */
export interface SellerHandoff {
  app_key: string;
  access_token: string;
  mode?: string;
  nexconn_user_id: string;
  deal_id: string;
}
const HANDOFF_KEY = "mudra.call.seller";
const CHANNEL = "mudra-call";

export function readSellerHandoff(): SellerHandoff | null {
  try {
    const raw = localStorage.getItem(HANDOFF_KEY);
    return raw ? (JSON.parse(raw) as SellerHandoff) : null;
  } catch {
    return null;
  }
}

/** Seller window: answer the buyer tab's "ping" with "ready" once the call engine is listening. */
export function announceSellerReady(userId: string): () => void {
  const bc = new BroadcastChannel(CHANNEL);
  const ready = () => bc.postMessage({ type: "ready", userId });
  bc.onmessage = (e) => {
    if ((e.data as { type?: string })?.type === "ping") ready();
  };
  ready();
  return () => bc.close();
}

/** Buyer tab: open (or reuse) the seller window from a user gesture and wait until it is ready to answer. */
export function openSellerWindow(handoff: SellerHandoff, timeoutMs = 25000): Promise<void> {
  localStorage.setItem(HANDOFF_KEY, JSON.stringify(handoff));
  const bc = new BroadcastChannel(CHANNEL);
  const ready = new Promise<void>((resolve, reject) => {
    const t = window.setTimeout(() => {
      bc.close();
      reject(new Error("seller window did not open or connect; allow popups for this site"));
    }, timeoutMs);
    bc.onmessage = (e) => {
      const d = e.data as { type?: string; userId?: string };
      if (d?.type === "ready" && d.userId === handoff.nexconn_user_id) {
        window.clearTimeout(t);
        bc.close();
        resolve();
      }
    };
  });
  // Some embedded browsers open the window but return null, so wait for the ready signal either way.
  window.open("/call/seller", "mudra-seller-call", "popup,width=460,height=620");
  bc.postMessage({ type: "ping" });
  return ready;
}

export async function hangUp(): Promise<void> {
  const e = getCallEngine();
  if (e?.getCurrentCallSession()) await e.endCall().catch(() => undefined);
}
