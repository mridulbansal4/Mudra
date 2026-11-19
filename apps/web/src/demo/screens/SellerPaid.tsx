import { BadgeCheck } from "lucide-react";
import { CountUp } from "../../ui/CountUp";
import { ListGroup, ListRow } from "../../ui/ListRow";
import { VelvetCard } from "../../ui/VelvetCard";
import { DEAL_META } from "../script";

export function SellerPaid() {
  return (
    <div className="flex min-h-full flex-col items-center justify-between bg-pop-black p-5 text-fg">
      <div className="my-auto flex flex-col items-center text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-card-3 text-neo-paccha">
          <BadgeCheck size={36} strokeWidth={1.5} aria-hidden="true" />
        </span>

        <div className="mt-5">
          <CountUp
            target={DEAL_META.amountInr}
            prefix="₹"
            formatIndian
            className="t-num-xl !text-[48px] text-neo-paccha"
          />
        </div>

        <p className="mt-2 text-[14px] font-semibold lowercase text-fg-2">
          paid out to your bank
        </p>
      </div>

      <VelvetCard className="w-full flex flex-col gap-3">
        <ListGroup>
          <ListRow label="deal id" value={DEAL_META.id} showChevron={false} />
          <ListRow label="settlement" value="instant · upi mandate" showChevron={false} />
        </ListGroup>
        <div className="text-center font-mono text-[11px] text-muted num">
          {DEAL_META.signatureHash}
        </div>
      </VelvetCard>
    </div>
  );
}
