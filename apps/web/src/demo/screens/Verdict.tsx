import { Scale } from "lucide-react";
import { NeoButton } from "../../ui/NeoButton";
import { VelvetCard } from "../../ui/VelvetCard";
import { DEAL_META } from "../script";
import type { DemoAction, DemoState } from "../store";

export interface VerdictProps {
  state: DemoState;
  dispatch: (action: DemoAction) => void;
}

export function Verdict({ state, dispatch }: VerdictProps) {
  const buyerPct = state.verdict?.buyerPct ?? 30;
  const sellerPct = state.verdict?.sellerPct ?? 70;
  const buyerInr = Math.round((DEAL_META.amountInr * buyerPct) / 100).toLocaleString("en-IN");
  const sellerInr = Math.round((DEAL_META.amountInr * sellerPct) / 100).toLocaleString("en-IN");

  return (
    <div className="flex min-h-full flex-col justify-between bg-pop-black p-4 text-fg">
      <VelvetCard className="flex flex-col gap-5">
        <div className="flex flex-col items-center text-center pt-2">
          <span className="flex size-14 items-center justify-center rounded-full bg-card-3 text-neo-paccha">
            <Scale size={28} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <div className="t-h1 num mt-3 !text-[36px] lowercase text-fg">
            split {sellerPct} / {buyerPct}
          </div>
          <p className="mt-1 text-[12.5px] font-medium lowercase text-muted">
            ruling by meera krishnan · binding escrow split
          </p>
        </div>

        {/* Two split bars */}
        <div className="flex flex-col gap-3">
          <div className="rounded-[16px] bg-card-2 p-3.5 border border-[var(--hairline)]">
            <div className="flex items-center justify-between text-[13px] font-semibold lowercase">
              <span className="text-fg-2">buyer refund ({buyerPct}%)</span>
              <span className="num text-[16px] font-extrabold text-fg">₹{buyerInr}</span>
            </div>
            <div className="mt-2 h-2 w-full bg-card-3 overflow-hidden">
              <div className="h-full bg-fg" style={{ width: `${buyerPct}%` }} />
            </div>
          </div>

          <div className="rounded-[16px] bg-card-2 p-3.5 border border-[var(--hairline)]">
            <div className="flex items-center justify-between text-[13px] font-semibold lowercase">
              <span className="text-fg-2">seller payout ({sellerPct}%)</span>
              <span className="num text-[16px] font-extrabold text-neo-paccha">₹{sellerInr}</span>
            </div>
            <div className="mt-2 h-2 w-full bg-card-3 overflow-hidden">
              <div className="h-full bg-neo-paccha" style={{ width: `${sellerPct}%` }} />
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--hairline)] pt-3 text-center font-mono text-[11px] text-muted num">
          {DEAL_META.signatureHash}
        </div>
      </VelvetCard>

      <div className="mt-4 pb-2">
        <NeoButton
          variant="white"
          size="md"
          fullWidth
          onClick={() => dispatch({ type: "REPLAY" })}
        >
          accept verdict
        </NeoButton>
      </div>
    </div>
  );
}
