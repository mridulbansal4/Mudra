import { useEffect, useState } from "react";
import { Vault } from "lucide-react";
import { useReducedMotion } from "../../motion/hooks";
import { Eyebrow } from "../../ui/Eyebrow";
import { ListGroup, ListRow } from "../../ui/ListRow";
import { SlideToLock } from "../parts/SlideToLock";
import { DEAL_META } from "../script";
import type { DemoAction, DemoState } from "../store";

export interface EscrowSheetProps {
  state: DemoState;
  dispatch: (action: DemoAction) => void;
  autoLock?: boolean;
}

export function EscrowSheet({ state, dispatch, autoLock = false }: EscrowSheetProps) {
  const reduced = Boolean(useReducedMotion());
  const [sealedMorph, setSealedMorph] = useState(false);

  // Reset morph phase when step changes back
  useEffect(() => {
    if (state.fsm === "CREATED") {
      setSealedMorph(false);
    }
  }, [state.fsm]);

  const handleLocked = () => {
    // Allow 240ms to show the knob's "locked" state + 120ms brightness flash before morphing to sealed Vault
    const morphDelay = reduced ? 0 : 240;
    window.setTimeout(() => {
      setSealedMorph(true);
    }, morphDelay);

    if (state.fsm === "CREATED") {
      window.setTimeout(() => {
        dispatch({ type: "FSM_TRANSITION", action: "LOCK_ESCROW", actor: "buyer" });
      }, morphDelay + 1600);
    }
  };

  return (
    <div className="flex min-h-full flex-col justify-end bg-pop-black/95 text-fg">
      <div
        className="flex flex-col gap-5 px-5 pt-3 pb-7"
        style={{
          borderTopLeftRadius: "28px",
          borderTopRightRadius: "28px",
          backgroundColor: "#121212",
          borderTop: "1px solid var(--hairline)",
        }}
      >
        {/* Grab handle */}
        <div className="flex justify-center" aria-hidden="true">
          <div
            style={{
              width: "36px",
              height: "4px",
              borderRadius: "2px",
              backgroundColor: "#3d3d3d",
            }}
          />
        </div>

        {sealedMorph ? (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="relative flex size-[120px] items-center justify-center">
              <svg
                width={120}
                height={120}
                viewBox="0 0 120 120"
                aria-hidden="true"
                className="absolute inset-0 -rotate-90"
              >
                <circle
                  cx={60}
                  cy={60}
                  r={54}
                  fill="none"
                  stroke="#e5fe40"
                  strokeWidth={3}
                  strokeDasharray={340}
                  strokeDashoffset={0}
                  style={{
                    animation: "seal-ring-draw 700ms ease-out both",
                  }}
                />
              </svg>
              <style>{`
                @keyframes seal-ring-draw {
                  from { stroke-dashoffset: 340; }
                  to { stroke-dashoffset: 0; }
                }
              `}</style>
              <Vault size={64} strokeWidth={1.5} className="text-neo-paccha" aria-hidden="true" />
            </div>

            <div className="t-h1 mt-5 !text-[40px] lowercase text-fg">sealed.</div>
            <p className="mt-2 max-w-[240px] text-[13px] font-medium lowercase text-fg-2">
              vikram can now start the live inspection.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center text-center">
              <Eyebrow dot>CONFIRM ESCROW</Eyebrow>
              <div className="num mt-3 text-[44px] font-extrabold leading-none text-fg">
                {DEAL_META.amountFormatted}
              </div>
              <p className="mt-2 text-[12px] font-medium lowercase text-muted">
                to vikramjeet singh · released only after you approve
              </p>
            </div>

            <ListGroup>
              <ListRow label="item" value="₹1,45,000" showChevron={false} />
              <ListRow
                label="escrow fee"
                delta="waived"
                value="₹0"
                showChevron={false}
              />
              <ListRow
                label="upi mandate"
                value={
                  <span className="font-mono text-[12px] font-medium text-fg-2">
                    {DEAL_META.upiMandate}
                  </span>
                }
                showChevron={false}
              />
            </ListGroup>

            <SlideToLock
              autoLock={autoLock || state.fsm !== "CREATED"}
              onLocked={handleLocked}
            />
          </>
        )}
      </div>
    </div>
  );
}
