import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { TOTAL_SCRIPT_STEPS } from "../script";
import type { DemoAction, DemoState } from "../store";

export interface ControlDockProps {
  state: DemoState;
  dispatch: (action: DemoAction) => void;
}

export function ControlDock({ state, dispatch }: ControlDockProps) {
  return (
    <div
      role="toolbar"
      aria-label="Demo playback controls"
      className="fixed bottom-5 left-1/2 z-30 -translate-x-1/2 flex h-[56px] items-center gap-2 px-2"
      style={{
        borderRadius: "999px",
        padding: "6px",
        backgroundColor: "rgba(18, 18, 18, 0.6)",
        backdropFilter: "blur(20px) saturate(140%)",
        border: "1px solid var(--hairline)",
      }}
    >
      <button
        type="button"
        aria-label="Previous step"
        onClick={() => dispatch({ type: "PREV_STEP" })}
        className="flex size-[44px] items-center justify-center rounded-full bg-transparent text-fg hover:bg-card-3 border-0 cursor-pointer press"
      >
        <SkipBack size={18} strokeWidth={1.5} aria-hidden="true" />
      </button>

      <button
        type="button"
        aria-label={state.playing ? "Pause demo" : "Play demo"}
        onClick={() => dispatch({ type: "SET_PLAYING", playing: !state.playing })}
        className="flex size-[44px] items-center justify-center rounded-full bg-neo-paccha text-paccha-ink border-0 cursor-pointer press"
      >
        {state.playing ? (
          <Pause size={18} strokeWidth={2} aria-hidden="true" />
        ) : (
          <Play size={18} strokeWidth={2} aria-hidden="true" />
        )}
      </button>

      <button
        type="button"
        aria-label="Next step"
        onClick={() => {
          dispatch({ type: "SET_PLAYING", playing: false });
          dispatch({ type: "NEXT_STEP" });
        }}
        className="flex size-[44px] items-center justify-center rounded-full bg-transparent text-fg hover:bg-card-3 border-0 cursor-pointer press"
      >
        <SkipForward size={18} strokeWidth={1.5} aria-hidden="true" />
      </button>

      <div className="num px-3 text-[13px] font-bold text-fg select-none">
        {state.step} / {TOTAL_SCRIPT_STEPS}
      </div>

      <button
        type="button"
        aria-label={`Playback speed ${state.speed}x`}
        onClick={() =>
          dispatch({ type: "SET_SPEED", speed: state.speed === 1 ? 2 : 1 })
        }
        className="num flex h-[38px] items-center gap-1 rounded-full bg-card-3 px-3.5 text-[12px] font-bold text-fg border-0 cursor-pointer press"
      >
        <span className={state.speed === 1 ? "text-neo-paccha" : "text-muted"}>1×</span>
        <span className="text-muted">|</span>
        <span className={state.speed === 2 ? "text-neo-paccha" : "text-muted"}>2×</span>
      </button>
    </div>
  );
}
