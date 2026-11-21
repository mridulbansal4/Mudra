import type { FsmState } from "@mudra/shared-types";
import { storyStage } from "@mudra/shared-types";

const STAGES = ["Negotiate", "Lock escrow", "Video assay", "Release or freeze"];

const NEXT_STEP: Record<FsmState, string> = {
  CREATED: "Agree on a price in chat, then press Lock escrow in the deal card",
  FUNDED: "Press Verify on live video to start the serial-plate and motor assay",
  INSPECTION_LIVE: "Capture proof in the assay loupe to verify the frame and motor RPM",
  ASSAY_VERIFIED: "Buyer releases funds, or either party raises a dispute",
  RELEASED: "Settled. Every step is in the signed voucher chain on the right",
  DISPUTED_FROZEN: "Channel frozen. An arbitrator executes the tribunal split from /dispatch",
  ARBITRATED_SPLIT: "Settled by binding split. Voucher chain closed",
  REFUNDED: "Buyer refunded in full. Voucher chain closed",
};

/** The persistent 4-stage deal story bar (F-02) with a single next-step line. */
export function StoryBar({ state }: { state: FsmState }) {
  const stage = storyStage(state);
  const frozen = state === "DISPUTED_FROZEN";
  return (
    <div className="glass border-b hairline">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 pt-3 text-[13.5px]" aria-label="Deal stages">
        {STAGES.map((s, i) => {
          const n = i + 1;
          const done = n < stage || (n === 4 && stage === 4 && !frozen);
          const current = n === stage;
          return (
            <li key={s} className="flex items-center gap-2">
              <span
                className={`num flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                  done ? "bg-vault text-white" : current ? (frozen ? "bg-freeze text-white" : "bg-seal text-seal-ink") : "bg-well text-ink-3"
                }`}
                aria-hidden="true"
              >
                {n}
              </span>
              <span className={current ? "font-medium text-ink" : "text-ink-3"} aria-current={current ? "step" : undefined}>
                {s}
              </span>
              {n < 4 ? <span className="mx-1 h-px w-6 bg-hair" aria-hidden="true" /> : null}
            </li>
          );
        })}
      </ol>
      <p className="px-4 pb-2.5 pt-1 text-[13px] text-ink-2">
        <span className="text-ink-3">Next step: </span>
        {NEXT_STEP[state]}
      </p>
    </div>
  );
}
