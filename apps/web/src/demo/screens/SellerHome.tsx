import { useEffect, useState } from "react";
import { storyStage } from "@samadhan/shared-types";
import {
  BadgeCheck,
  IndianRupee,
  LayoutGrid,
  ReceiptText,
  Vault,
  Video,
} from "lucide-react";
import { Eyebrow } from "../../ui/Eyebrow";
import { IconTile } from "../../ui/IconTile";
import { ListGroup, ListRow } from "../../ui/ListRow";
import { StatusPill, fsmToneAndLabel } from "../../ui/StatusPill";
import { VelvetCard } from "../../ui/VelvetCard";
import { AppShell } from "../AppShell";
import { DEAL_META } from "../script";
import type { DemoAction, DemoState } from "../store";

export interface SellerHomeProps {
  state: DemoState;
  dispatch: (action: DemoAction) => void;
}

export function SellerHome({ state, dispatch }: SellerHomeProps) {
  const funded = state.fsm !== "CREATED";
  const stage = storyStage(state.fsm);
  const pill = fsmToneAndLabel(state.fsm);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (!funded) return;
    setFlash(true);
    const t = window.setTimeout(() => setFlash(false), 600);
    return () => window.clearTimeout(t);
  }, [funded]);

  const openChat = () => dispatch({ type: "NAV_SELLER", screen: "S2" });

  return (
    <AppShell
      personaName="VIKRAM"
      personaInitials="VS"
      onDealsTap={openChat}
      onScanTap={() => dispatch({ type: "NAV_SELLER", screen: "S3" })}
    >
      {state.sellerToast ? (
        <button
          type="button"
          onClick={openChat}
          className="mb-3 flex w-full items-center justify-between px-3.5 py-2.5 text-left text-[12.5px] font-semibold lowercase text-paccha-ink bg-neo-paccha cursor-pointer press"
          style={{ borderRadius: "14px" }}
        >
          <span>{state.sellerToast}</span>
          <span className="text-[11px] font-extrabold lowercase">open</span>
        </button>
      ) : null}

      <Eyebrow dot className="mb-3">
        YOUR SALES
      </Eyebrow>

      <ListGroup>
        <ListRow
          icon={Vault}
          label={funded ? "in escrow for you" : "awaiting escrow"}
          delta={funded ? "+₹1,45,000" : undefined}
          value={funded ? "₹1,45,000" : "₹0"}
          flashPaccha={flash}
          onClick={openChat}
        />
        <ListRow
          icon={IndianRupee}
          label="payouts this month"
          value="₹6,80,000"
          onClick={openChat}
        />
        <ListRow icon={BadgeCheck} label="rating" value="4.9" onClick={openChat} />
      </ListGroup>

      <Eyebrow className="mt-8 mb-3">EXPLORE SAMADHAN</Eyebrow>
      <div className="grid grid-cols-4 gap-3 items-start justify-items-center">
        <IconTile
          icon={Video}
          label="go live"
          onClick={() => dispatch({ type: "NAV_SELLER", screen: "S3" })}
        />
        <IconTile icon={LayoutGrid} label="listings" onClick={openChat} />
        <IconTile
          icon={IndianRupee}
          label="payouts"
          onClick={() => dispatch({ type: "NAV_SELLER", screen: "S5" })}
        />
        <IconTile
          icon={ReceiptText}
          label="receipts"
          onClick={() => dispatch({ type: "NAV_SELLER", screen: "S4" })}
        />
      </div>

      <Eyebrow className="mt-8 mb-3">ACTIVE DEAL</Eyebrow>
      <VelvetCard onClick={openChat} className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[15px] font-bold lowercase text-fg leading-snug">
              {DEAL_META.item.toLowerCase()}
            </div>
            <div className="mt-0.5 text-[12px] font-medium lowercase text-muted">
              rajesh natarajan · tirupur
            </div>
          </div>
          <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
        </div>

        <div className="num text-[28px] font-extrabold text-fg leading-none">
          {DEAL_META.amountFormatted}
        </div>

        <div aria-hidden="true" className="grid grid-cols-4 gap-1 pt-1">
          {[1, 2, 3, 4].map((idx) => (
            <span
              key={idx}
              className="h-[4px] w-full"
              style={{
                backgroundColor: idx <= stage ? "var(--neo-paccha)" : "var(--card-3)",
              }}
            />
          ))}
        </div>
      </VelvetCard>
    </AppShell>
  );
}
