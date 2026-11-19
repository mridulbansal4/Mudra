import type { FsmAction, FsmState } from "@samadhan/shared-types";
import { connectDemoBroadcast } from "./broadcast";
import {
  applyFsmMove,
  applyStep,
  SCRIPT_MESSAGES,
  TOTAL_SCRIPT_STEPS,
  type DemoBranch,
  type DemoEventLogEntry,
  type DemoMessage,
  type ScreenId,
} from "./script";

export interface DemoState {
  fsm: FsmState;
  step: number;
  messages: DemoMessage[];
  buyerScreen: ScreenId;
  sellerScreen: ScreenId;
  arbiterScreen: ScreenId;
  rpm: number;
  frameMatch: number;
  freezeLeft: number;
  liveSeconds: number;
  verdict?: { buyerPct: number; sellerPct: number };
  branch: DemoBranch;
  playing: boolean;
  speed: 1 | 2;
  checklist: [boolean, boolean, boolean];
  sellerToast?: string;
  incomingCallBanner: boolean;
  eventLog: DemoEventLogEntry[];
  lastPacket?: {
    seq: number;
    from: "buyer" | "seller" | "arbiter";
    to: "buyer" | "seller";
    label: string;
  };
}

export type DemoAction =
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "JUMP_TO_STEP"; step: number; branch?: DemoBranch }
  | { type: "SYNC_STATE"; state: DemoState }
  | { type: "SET_BRANCH"; branch: DemoBranch }
  | { type: "SET_PLAYING"; playing: boolean }
  | { type: "SET_SPEED"; speed: 1 | 2 }
  | { type: "REPLAY" }
  | { type: "FSM_TRANSITION"; action: FsmAction; actor?: "buyer" | "seller" | "arbitrator" }
  | { type: "NAV_BUYER"; screen: ScreenId }
  | { type: "NAV_SELLER"; screen: ScreenId }
  | { type: "SEND_MESSAGE"; from: "buyer" | "seller"; text: string }
  | { type: "SET_TELEMETRY"; rpm?: number; frameMatch?: number; checklist?: [boolean, boolean, boolean] }
  | { type: "TICK_FREEZE"; freezeLeft?: number }
  | { type: "TICK_LIVE" };

export function createInitialDemoState(branch: DemoBranch = "happy", playing = true): DemoState {
  return {
    fsm: "CREATED",
    step: 0,
    messages: [],
    buyerScreen: "B1",
    sellerScreen: "S1",
    arbiterScreen: "A1",
    rpm: 0,
    frameMatch: 0,
    freezeLeft: 90,
    liveSeconds: 134,
    verdict: undefined,
    branch,
    playing,
    speed: 1,
    checklist: [false, false, false],
    sellerToast: undefined,
    incomingCallBanner: false,
    eventLog: [],
    lastPacket: undefined,
  };
}

export function replayToStep(step: number, branch: DemoBranch, playing = false): DemoState {
  const clamped = Math.max(0, Math.min(TOTAL_SCRIPT_STEPS, step));
  let s = createInitialDemoState(branch, playing);
  for (let i = 1; i <= clamped; i++) {
    s = applyStep(s, i);
  }
  return { ...s, playing };
}

export function demoReducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case "SYNC_STATE":
      return action.state;
    case "NEXT_STEP": {
      if (state.step >= TOTAL_SCRIPT_STEPS) {
        return { ...state, playing: false };
      }
      return applyStep(state, state.step + 1);
    }
    case "PREV_STEP": {
      const prev = Math.max(0, state.step - 1);
      return replayToStep(prev, state.branch, false);
    }
    case "JUMP_TO_STEP": {
      const branch = action.branch ?? state.branch;
      return replayToStep(action.step, branch, false);
    }
    case "SET_BRANCH":
      return createInitialDemoState(action.branch, true);
    case "SET_PLAYING":
      return { ...state, playing: action.playing };
    case "SET_SPEED":
      return { ...state, speed: action.speed };
    case "REPLAY":
      return createInitialDemoState(state.branch, true);
    case "NAV_BUYER":
      return { ...state, buyerScreen: action.screen, playing: false };
    case "NAV_SELLER":
      return { ...state, sellerScreen: action.screen, playing: false };
    case "SEND_MESSAGE": {
      const id = `msg-custom-${state.messages.length + 1}`;
      const msg: DemoMessage = {
        id,
        from: action.from,
        ta: action.text,
        hi: action.text,
        en: action.text,
        kind: "text",
      };
      const seq = (state.lastPacket?.seq ?? 0) + 1;
      return {
        ...state,
        playing: false,
        buyerScreen: "B2",
        sellerScreen: "S2",
        messages: [...state.messages, msg],
        lastPacket: {
          seq,
          from: action.from,
          to: action.from === "buyer" ? "seller" : "buyer",
          label: "CHAT_MESSAGE",
        },
      };
    }
    case "SET_TELEMETRY":
      return {
        ...state,
        rpm: action.rpm ?? state.rpm,
        frameMatch: action.frameMatch ?? state.frameMatch,
        checklist: action.checklist ?? state.checklist,
      };
    case "TICK_FREEZE": {
      if (state.fsm !== "DISPUTED_FROZEN") return state;
      const next = action.freezeLeft ?? Math.max(0, state.freezeLeft - 1);
      if (next <= 72 && state.step === 7 && state.playing) {
        return applyStep({ ...state, freezeLeft: 72 }, 8);
      }
      return { ...state, freezeLeft: next };
    }
    case "TICK_LIVE":
      return { ...state, liveSeconds: state.liveSeconds + 1 };
    case "FSM_TRANSITION": {
      const actor = action.actor ?? "buyer";
      const moved = applyFsmMove(state, action.action, actor, 0.9);
      if (moved === state) return state;
      const seq = (state.lastPacket?.seq ?? 0) + 1;
      switch (action.action) {
        case "LOCK_ESCROW":
          return {
            ...moved,
            step: Math.max(moved.step, 4),
            playing: false,
            buyerScreen: "B2",
            sellerScreen: "S2",
            messages: [...moved.messages, SCRIPT_MESSAGES.m3_escrow],
            lastPacket: { seq, from: "buyer", to: "seller", label: "LOCK_ESCROW" },
          };
        case "START_ASSAY":
          return {
            ...moved,
            step: Math.max(moved.step, 6),
            playing: false,
            buyerScreen: "B4",
            sellerScreen: "S3",
            incomingCallBanner: true,
            rpm: 4820,
            frameMatch: 96,
            checklist: [true, true, true],
            lastPacket: { seq, from: "seller", to: "buyer", label: "START_ASSAY" },
          };
        case "MARK_ASSAY_VERIFIED":
          return {
            ...moved,
            step: Math.max(moved.step, 7),
            playing: false,
            buyerScreen: "B5",
            sellerScreen: "S4",
            messages: [...moved.messages, SCRIPT_MESSAGES.m4_receipt],
            lastPacket: { seq, from: "buyer", to: "seller", label: "MARK_ASSAY_VERIFIED" },
          };
        case "RELEASE_FUNDS":
          return {
            ...moved,
            step: 8,
            playing: false,
            buyerScreen: "B5",
            sellerScreen: "S5",
            lastPacket: { seq, from: "buyer", to: "seller", label: "RELEASE_FUNDS" },
          };
        case "RAISE_DISPUTE":
          return {
            ...moved,
            branch: "dispute",
            step: 7,
            playing: false,
            buyerScreen: "B6",
            sellerScreen: "S6",
            freezeLeft: 87,
            lastPacket: { seq, from: "buyer", to: "seller", label: "RAISE_DISPUTE" },
          };
        case "RESOLVE_SPLIT":
          return {
            ...moved,
            branch: "dispute",
            step: 8,
            playing: false,
            buyerScreen: "B7",
            sellerScreen: "S6",
            freezeLeft: 72,
            verdict: { buyerPct: 30, sellerPct: 70 },
            messages: [...moved.messages, SCRIPT_MESSAGES.m5_verdict],
            lastPacket: { seq, from: "arbiter", to: "buyer", label: "RESOLVE_SPLIT" },
          };
        case "REFUND_BUYER":
          return {
            ...moved,
            branch: "dispute",
            step: 8,
            playing: false,
            buyerScreen: "B7",
            sellerScreen: "S6",
            verdict: { buyerPct: 100, sellerPct: 0 },
            lastPacket: { seq, from: "arbiter", to: "buyer", label: "REFUND_BUYER" },
          };
      }
    }
  }
}

export interface DemoStore {
  getState: () => DemoState;
  subscribe: (listener: () => void) => () => void;
  dispatch: (action: DemoAction, broadcast?: boolean) => void;
  destroy: () => void;
}

export function createDemoStore(initialBranch: DemoBranch = "happy", initialPlaying = true): DemoStore {
  let state = createInitialDemoState(initialBranch, initialPlaying);
  const listeners = new Set<() => void>();

  const notify = () => {
    for (const l of listeners) l();
  };

  const bc = connectDemoBroadcast((remoteAction) => {
    state = demoReducer(state, remoteAction);
    notify();
  });

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispatch: (action, broadcast = true) => {
      const next = demoReducer(state, action);
      if (next !== state) {
        state = next;
        if (broadcast) bc.post(action);
        notify();
      } else if (action.type === "SYNC_STATE" && broadcast) {
        bc.post(action);
      }
    },
    destroy: () => {
      bc.close();
      listeners.clear();
    },
  };
}
