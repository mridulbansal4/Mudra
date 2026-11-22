import { useEffect, useState } from "react";
import { Vault, Wallet } from "lucide-react";
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
  const [method, setMethod] = useState<PayMethod>("wallet");

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

            <PayMethodPicker method={method} onChange={setMethod} />

            <ListGroup>
              <ListRow label="item" value="₹1,45,000" showChevron={false} />
              <ListRow
                label="escrow fee"
                delta="waived"
                value="₹0"
                showChevron={false}
              />
              <ListRow
                label={method === "wallet" ? "paid from" : "upi mandate"}
                value={
                  <span className="font-mono text-[12px] font-medium text-fg-2">
                    {method === "wallet" ? "mudra wallet" : `${UPI_APPS.find((a) => a.id === method)?.label} · ${DEAL_META.upiMandate}`}
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

type PayMethod = "wallet" | "gpay" | "phonepe" | "paytm" | "bhim";

const UPI_APPS: { id: Exclude<PayMethod, "wallet">; label: string }[] = [
  { id: "gpay", label: "gpay" },
  { id: "phonepe", label: "phonepe" },
  { id: "paytm", label: "paytm" },
  { id: "bhim", label: "bhim" },
];

const WALLET_BALANCE = "₹2,40,000";

function PayMethodPicker({ method, onChange }: { method: PayMethod; onChange: (m: PayMethod) => void }) {
  const walletOn = method === "wallet";
  return (
    <div className="flex flex-col gap-2.5" role="radiogroup" aria-label="Pay from">
      <span className="text-[11px] font-semibold lowercase text-muted">pay from</span>
      <button
        type="button"
        role="radio"
        aria-checked={walletOn}
        onClick={() => onChange("wallet")}
        className="press flex items-center gap-3 px-3.5 py-3 text-left cursor-pointer"
        style={{
          borderRadius: "16px",
          backgroundColor: walletOn ? "rgba(229, 254, 64, 0.10)" : "#1a1a1a",
          boxShadow: walletOn ? "inset 0 0 0 1.5px #e5fe40" : "inset 0 0 0 1px var(--hairline)",
        }}
      >
        <span
          className="flex size-[34px] items-center justify-center rounded-full"
          style={{ backgroundColor: walletOn ? "#e5fe40" : "#2b2b2b", color: walletOn ? "#0d0d0d" : "#f5f5f5" }}
        >
          <Wallet size={17} strokeWidth={1.8} aria-hidden="true" />
        </span>
        <span className="flex flex-1 flex-col">
          <span className="text-[13px] font-semibold lowercase text-fg">mudra wallet</span>
          <span className="text-[11px] font-medium lowercase text-muted">
            balance <span className="num">{WALLET_BALANCE}</span>
          </span>
        </span>
        <span
          aria-hidden="true"
          className="size-[16px] rounded-full"
          style={{ boxShadow: walletOn ? "inset 0 0 0 5px #e5fe40" : "inset 0 0 0 1.5px #5c5c5c" }}
        />
      </button>
      <span className="pt-1 text-[11px] font-semibold lowercase text-muted">or any upi app</span>
      <div className="grid grid-cols-4 gap-2">
        {UPI_APPS.map((app) => {
          const on = method === app.id;
          return (
            <button
              key={app.id}
              type="button"
              role="radio"
              aria-checked={on}
              data-upi={app.id}
              onClick={() => onChange(app.id)}
              className="press py-2.5 text-[12px] font-semibold lowercase cursor-pointer"
              style={{
                borderRadius: "12px",
                backgroundColor: on ? "#6a35ff" : "#1a1a1a",
                color: on ? "#ffffff" : "#d4d4d4",
                boxShadow: on ? "none" : "inset 0 0 0 1px var(--hairline)",
              }}
            >
              {app.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
