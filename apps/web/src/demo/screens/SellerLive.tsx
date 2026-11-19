import { BadgeCheck } from "lucide-react";
import { ListGroup, ListRow } from "../../ui/ListRow";
import { VelvetCard } from "../../ui/VelvetCard";
import { RpmMeter } from "../parts/RpmMeter";
import { SimVideo } from "../parts/SimVideo";
import { DEAL_META } from "../script";
import type { DemoAction, DemoState } from "../store";

export interface SellerLiveProps {
  state: DemoState;
  dispatch: (action: DemoAction) => void;
}

const CHECKLIST_LABELS = [
  "show serial number",
  "run motor 10 s",
  "show stitching sample",
] as const;

export function SellerLive({ state, dispatch }: SellerLiveProps) {
  const toggleItem = (idx: 0 | 1 | 2) => {
    const next: [boolean, boolean, boolean] = [...state.checklist] as [
      boolean,
      boolean,
      boolean,
    ];
    next[idx] = !next[idx];
    dispatch({
      type: "SET_TELEMETRY",
      checklist: next,
      rpm: next.every(Boolean) ? 4820 : state.rpm,
      frameMatch: next.every(Boolean) ? 96 : state.frameMatch,
    });
  };

  return (
    <div className="flex h-full min-h-[760px] flex-col bg-pop-black text-fg">
      <SimVideo
        perspective="seller"
        liveSeconds={state.liveSeconds}
        frameMatch={state.frameMatch}
        rpm={state.rpm}
        className="h-[54%] min-h-[360px]"
      />

      <div
        className="-mt-5 relative z-20 flex flex-1 flex-col justify-between gap-4 p-5"
        style={{
          borderTopLeftRadius: "28px",
          borderTopRightRadius: "28px",
          backgroundColor: "#121212",
          borderTop: "1px solid var(--hairline)",
        }}
      >
        <RpmMeter frameMatch={state.frameMatch} rpm={state.rpm} />

        {/* Checklist card */}
        <div
          className="divide-y divide-[var(--hairline)] overflow-hidden"
          style={{
            borderRadius: "20px",
            backgroundColor: "var(--card-2)",
            border: "1px solid var(--hairline)",
          }}
        >
          {CHECKLIST_LABELS.map((label, i) => {
            const idx = i as 0 | 1 | 2;
            const checked = state.checklist[idx];
            return (
              <button
                key={label}
                type="button"
                onClick={() => toggleItem(idx)}
                className="flex h-[48px] w-full items-center justify-between px-3.5 bg-transparent border-0 text-left cursor-pointer press"
              >
                <span className="num text-[13.5px] font-medium lowercase text-fg">{label}</span>
                <span
                  className="flex size-[22px] items-center justify-center"
                  style={{
                    borderRadius: "6px",
                    border: checked ? "1.5px solid var(--neo-paccha)" : "1.5px solid #3d3d3d",
                    backgroundColor: checked ? "rgba(229,254,64,0.14)" : "transparent",
                  }}
                >
                  {checked ? (
                    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <path
                        d="M2.5 7.2L5.6 10.3L11.5 3.8"
                        stroke="#e5fe40"
                        strokeWidth={2}
                        strokeLinecap="square"
                        style={{
                          strokeDasharray: 20,
                          strokeDashoffset: 0,
                          animation: `tick-draw 260ms ease-out ${idx * 220}ms both`,
                        }}
                      />
                    </svg>
                  ) : null}
                </span>
              </button>
            );
          })}
          <style>{`
            @keyframes tick-draw {
              from { stroke-dashoffset: 20; }
              to { stroke-dashoffset: 0; }
            }
          `}</style>
        </div>
      </div>
    </div>
  );
}

export function SellerAwaitingRelease({ state }: { state: DemoState }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-between bg-pop-black p-5 text-fg">
      <div className="my-auto flex flex-col items-center text-center gap-4">
        <div className="relative flex size-[112px] items-center justify-center">
          <svg width={112} height={112} viewBox="0 0 112 112" fill="none" aria-hidden="true">
            <circle cx={56} cy={56} r={50} stroke="#232323" strokeWidth={6} />
            <circle
              cx={56}
              cy={56}
              r={50}
              stroke="#e5fe40"
              strokeWidth={6}
              strokeDasharray="240 80"
            />
            <path d="M56 32v26l16 10" stroke="#ffffff" strokeWidth={3} strokeLinecap="round" />
          </svg>
        </div>

        <h3 className="t-h2 !text-[24px] lowercase text-fg max-w-[260px]">
          verified. waiting for rajesh to release.
        </h3>
      </div>

      <VelvetCard className="w-full flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[13px] font-bold lowercase text-neo-paccha">
            <BadgeCheck size={16} strokeWidth={1.5} aria-hidden="true" />
            <span>assay receipt sealed</span>
          </span>
          <span className="num text-[14px] font-extrabold text-fg">
            {DEAL_META.amountFormatted}
          </span>
        </div>
        <ListGroup>
          <ListRow label="frame match" value={`${state.frameMatch || 96}%`} showChevron={false} />
          <ListRow
            label="motor"
            value={`${(state.rpm || 4820).toLocaleString("en-IN")} rpm`}
            showChevron={false}
          />
        </ListGroup>
        <div className="font-mono text-[11px] text-muted num">{DEAL_META.signatureHash}</div>
      </VelvetCard>
    </div>
  );
}
