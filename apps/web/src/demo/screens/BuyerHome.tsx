import { storyStage } from "@samadhan/shared-types";
import {
  BadgeCheck,
  Gift,
  Handshake,
  IndianRupee,
  LayoutGrid,
  ReceiptText,
  Scale,
  ScanEye,
  Vault,
} from "lucide-react";
import { Eyebrow } from "../../ui/Eyebrow";
import { IconTile } from "../../ui/IconTile";
import { ListGroup, ListRow } from "../../ui/ListRow";
import { StatusPill, fsmToneAndLabel } from "../../ui/StatusPill";
import { VelvetCard } from "../../ui/VelvetCard";
import { AppShell } from "../AppShell";
import { DEAL_META } from "../script";
import type { DemoAction, DemoState } from "../store";

export interface BuyerHomeProps {
  state: DemoState;
  dispatch: (action: DemoAction) => void;
}

export function BuyerHome({ state, dispatch }: BuyerHomeProps) {
  const funded = state.fsm !== "CREATED";
  const stage = storyStage(state.fsm);
  const pill = fsmToneAndLabel(state.fsm);

  const openChat = () => dispatch({ type: "NAV_BUYER", screen: "B2" });

  return (
    <AppShell
      personaName="RAJESH"
      personaInitials="RN"
      onDealsTap={openChat}
      onScanTap={() => dispatch({ type: "NAV_BUYER", screen: "B3" })}
    >
      <Eyebrow dot className="mb-3">
        YOUR DEALS
      </Eyebrow>

      <ListGroup>
        <ListRow
          icon={Vault}
          label="in escrow"
          delta={funded ? "+₹1,45,000" : undefined}
          value="₹1,45,000"
          onClick={openChat}
        />
        <ListRow icon={Handshake} label="live deals" value="2" onClick={openChat} />
        <ListRow icon={ReceiptText} label="signed receipts" value="14" onClick={openChat} />
      </ListGroup>

      <Eyebrow className="mt-8 mb-3">EXPLORE SAMADHAN</Eyebrow>
      <div className="grid grid-cols-4 gap-3 items-start justify-items-center">
        <IconTile icon={Handshake} label="deals" onClick={openChat} />
        <IconTile
          icon={ScanEye}
          label="inspect"
          onClick={() => dispatch({ type: "NAV_BUYER", screen: "B4" })}
        />
        <IconTile
          icon={Vault}
          label="vault"
          onClick={() => dispatch({ type: "NAV_BUYER", screen: "B3" })}
        />
        <IconTile
          icon={ReceiptText}
          label="receipts"
          onClick={() => dispatch({ type: "NAV_BUYER", screen: "B5" })}
        />

        {/* Second row: wide pill tile spanning 2 columns + refer + more */}
        <button
          type="button"
          onClick={openChat}
          className="col-span-2 flex flex-col items-center gap-[10px] w-full bg-transparent border-0 p-0 cursor-pointer press"
        >
          <span
            className="flex h-[64px] w-full items-center justify-center gap-1.5 px-3"
            style={{
              borderRadius: "999px",
              backgroundColor: "var(--card-3)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 0 0 1px rgba(255,255,255,0.04)",
            }}
          >
            {[IndianRupee, BadgeCheck, Scale].map((Glyph, idx) => (
              <span
                key={idx}
                className="flex size-[40px] items-center justify-center rounded-full bg-card-2 text-fg"
              >
                <Glyph size={18} strokeWidth={1.5} aria-hidden="true" />
              </span>
            ))}
          </span>
          <span className="text-[12px] font-medium lowercase text-fg-2 leading-none">
            trust score
          </span>
        </button>

        <IconTile icon={Gift} label="refer" badge="₹1,000" onClick={openChat} />
        <IconTile icon={LayoutGrid} label="more" onClick={openChat} />
      </div>

      <Eyebrow className="mt-8 mb-3">ACTIVE DEAL</Eyebrow>
      <VelvetCard onClick={openChat} className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[15px] font-bold lowercase text-fg leading-snug">
              {DEAL_META.item.toLowerCase()}
            </div>
            <div className="mt-0.5 text-[12px] font-medium lowercase text-muted">
              vikramjeet singh · ludhiana
            </div>
          </div>
          <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
        </div>

        <div className="num text-[28px] font-extrabold text-fg leading-none">
          {DEAL_META.amountFormatted}
        </div>

        {/* 4-segment progress bar */}
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
