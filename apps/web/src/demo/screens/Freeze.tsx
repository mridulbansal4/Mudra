import { Mic, Snowflake } from "lucide-react";
import { CountdownRing } from "../parts/CountdownRing";
import type { DemoAction, DemoState } from "../store";
import { Verdict } from "./Verdict";

export interface FreezeProps {
  state: DemoState;
  dispatch: (action: DemoAction) => void;
  viewer?: "buyer" | "seller";
}

export function Freeze({ state, dispatch, viewer = "buyer" }: FreezeProps) {
  if (viewer === "seller" && state.fsm === "ARBITRATED_SPLIT") {
    return <Verdict state={state} dispatch={dispatch} />;
  }

  return (
    <div
      className="flex min-h-full flex-col justify-between bg-pop-black p-4 text-fg"
      style={{
        boxShadow: "inset 0 0 0 1px #ff8744",
      }}
    >
      {/* Top banner */}
      <div
        className="flex items-center justify-center gap-2 py-2 px-3 text-[12px] font-bold lowercase text-orange-sunshine"
        style={{
          borderRadius: "12px",
          backgroundColor: "rgba(255, 135, 68, 0.12)",
          border: "1px solid rgba(255, 135, 68, 0.3)",
        }}
      >
        <Snowflake size={16} strokeWidth={1.5} aria-hidden="true" />
        <span>deal frozen</span>
      </div>

      {/* 90-second countdown ring */}
      <div className="my-5 flex flex-col items-center">
        <CountdownRing seconds={state.freezeLeft} size={220} />
      </div>

      {viewer === "buyer" ? (
        <div className="flex flex-col gap-4">
          {/* Arbitrator reviewing row */}
          <div className="flex items-center justify-between rounded-[16px] bg-card p-3.5 border border-[var(--hairline)]">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-full bg-card-3 text-[11px] font-bold text-fg">
                MK
              </span>
              <span className="text-[13px] font-semibold lowercase text-fg">
                meera krishnan is reviewing
              </span>
            </div>
            <span className="inline-flex items-center gap-1" aria-hidden="true">
              {[0, 1, 2].map((d) => (
                <span
                  key={d}
                  className="size-[4px] rounded-full bg-orange-sunshine"
                  style={{
                    animation: `dot-wave 1.1s ease-in-out ${d * 0.18}s infinite`,
                  }}
                />
              ))}
            </span>
          </div>

          {/* Evidence attached */}
          <div className="rounded-[20px] bg-card p-3.5 border border-[var(--hairline)]">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
              EVIDENCE ATTACHED
            </div>
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {["#01", "#02", "#03"].map((tag) => (
                  <div
                    key={tag}
                    className="num flex size-[56px] items-end justify-start p-1.5 font-mono text-[10px] text-muted"
                    style={{
                      borderRadius: "12px",
                      backgroundColor: "#1a1a1a",
                      border: "1px solid var(--hairline)",
                    }}
                  >
                    {tag}
                  </div>
                ))}
              </div>
              <span
                className="num px-2.5 py-1.5 text-[11px] font-semibold lowercase text-neo-paccha"
                style={{
                  borderRadius: "999px",
                  backgroundColor: "rgba(229, 254, 64, 0.1)",
                }}
              >
                4,820 rpm log
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 pb-3 text-center">
          <p className="num max-w-[260px] text-[14px] font-medium lowercase text-fg-2">
            rajesh raised a dispute. explain your side in 90 seconds.
          </p>
          <button
            type="button"
            aria-label="Record voice note for arbitrator"
            className="flex size-[56px] items-center justify-center rounded-full bg-card-3 text-orange-sunshine cursor-pointer press"
            style={{ border: "1.5px solid #ff8744" }}
          >
            <Mic size={22} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
