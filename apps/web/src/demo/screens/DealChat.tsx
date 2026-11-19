import { useEffect, useRef, useState } from "react";
import { ArrowUp, ChevronLeft, Languages, Snowflake, Video } from "lucide-react";
import { QUICK_PHRASES } from "../../lib/deal";
import { useReducedMotion } from "../../motion/hooks";
import { NeoButton } from "../../ui/NeoButton";
import { StatusPill, fsmToneAndLabel } from "../../ui/StatusPill";
import { VelvetCard } from "../../ui/VelvetCard";
import { BilingualBubble } from "../parts/BilingualBubble";
import { DEAL_META } from "../script";
import type { DemoAction, DemoState } from "../store";

export interface DealChatProps {
  state: DemoState;
  dispatch: (action: DemoAction) => void;
  viewer?: "buyer" | "seller";
}

export function DealChat({ state, dispatch, viewer = "buyer" }: DealChatProps) {
  const [draft, setDraft] = useState("");
  const reduced = Boolean(useReducedMotion());
  const isBuyer = viewer === "buyer";
  const peer = isBuyer ? DEAL_META.seller : DEAL_META.buyer;
  const subline = isBuyer
    ? "speaks हिन्दी · you see தமிழ்"
    : "speaks தமிழ் · you see हिन्दी";
  const pill = fsmToneAndLabel(state.fsm);
  const quickList = QUICK_PHRASES[isBuyer ? "ta-IN" : "hi-IN"];

  // Typing indicator before incoming message bubble (§8.5 Step 2: 800ms on seller, §8.7: 300ms incoming)
  const prevCountRef = useRef(state.messages.length);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);

  useEffect(() => {
    const prevCount = prevCountRef.current;
    prevCountRef.current = state.messages.length;
    if (reduced || state.messages.length <= prevCount) return;
    const latest = state.messages[state.messages.length - 1];
    if (latest && latest.kind === "text" && latest.from !== viewer) {
      setTypingMessageId(latest.id);
      const delayMs = !isBuyer && state.step === 2 ? 800 : 300;
      const t = window.setTimeout(() => setTypingMessageId(null), delayMs);
      return () => window.clearTimeout(t);
    }
  }, [isBuyer, reduced, state.messages, state.step, viewer]);

  const handleSend = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    dispatch({ type: "SEND_MESSAGE", from: viewer, text: trimmed });
    setDraft("");
  };

  return (
    <div className="flex min-h-full flex-col bg-pop-black text-fg px-3.5 pb-4">
      {/* Header */}
      <div className="flex h-[56px] shrink-0 items-center justify-between gap-2 border-b border-[var(--hairline)]">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() =>
              dispatch(
                isBuyer
                  ? { type: "NAV_BUYER", screen: "B1" }
                  : { type: "NAV_SELLER", screen: "S1" }
              )
            }
            aria-label="Back to home"
            className="bg-transparent border-0 p-1 text-fg cursor-pointer press"
          >
            <ChevronLeft size={20} strokeWidth={1.5} aria-hidden="true" />
          </button>
          <span
            aria-hidden="true"
            className="flex size-[36px] shrink-0 items-center justify-center rounded-full bg-card-3 text-[12px] font-bold text-fg"
          >
            {peer.initials}
          </span>
          <div className="min-w-0">
            <div className="truncate text-[15px] font-bold lowercase text-fg leading-tight">
              {peer.name.toLowerCase()}
            </div>
            <div className="truncate text-[11px] font-medium text-muted">{subline}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            aria-label="Start live video inspection"
            onClick={() =>
              dispatch({ type: "FSM_TRANSITION", action: "START_ASSAY", actor: "seller" })
            }
            className="bg-transparent border-0 p-1.5 text-fg cursor-pointer press"
          >
            <Video size={22} strokeWidth={1.5} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Freeze deal and raise dispute"
            onClick={() =>
              dispatch({ type: "FSM_TRANSITION", action: "RAISE_DISPUTE", actor: viewer })
            }
            className="bg-transparent border-0 p-1.5 text-orange-sunshine cursor-pointer press"
          >
            <Snowflake size={22} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Pinned deal strip */}
      <VelvetCard
        className="mt-3 flex items-center justify-between gap-2"
        style={{ borderRadius: "16px", padding: "12px" }}
      >
        <div className="min-w-0">
          <div className="truncate text-[12.5px] font-semibold lowercase text-fg">
            {DEAL_META.item.toLowerCase()}
          </div>
          <div className="num text-[14px] font-extrabold text-fg">
            {DEAL_META.amountFormatted}
          </div>
        </div>
        <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
      </VelvetCard>

      {/* Message stream */}
      <div className="my-3 flex flex-1 flex-col gap-2.5">
        {state.messages.map((m) => {
          if (m.id === typingMessageId) {
            return (
              <div
                key={`typing-${m.id}`}
                aria-label="Typing indicator"
                className="inline-flex w-fit items-center gap-1.5 px-4 py-3"
                style={{
                  backgroundColor: "var(--card-2)",
                  borderRadius: "20px 20px 20px 6px",
                }}
              >
                {[0, 1, 2].map((d) => (
                  <span
                    key={d}
                    className="size-[4px] rounded-full bg-fg-2"
                    style={{
                      animation: `dot-wave 1.1s ease-in-out ${d * 0.16}s infinite`,
                    }}
                  />
                ))}
              </div>
            );
          }
          return <BilingualBubble key={m.id} message={m} viewer={viewer} />;
        })}

        {/* Seller FUNDED callout card (§8.4 S2) */}
        {!isBuyer && state.fsm === "FUNDED" ? (
          <div
            className="mt-1 flex flex-col gap-3 p-3.5"
            style={{
              borderRadius: "20px",
              border: "1px solid rgba(229, 254, 64, 0.28)",
              backgroundColor: "rgba(229, 254, 64, 0.06)",
            }}
          >
            <p className="num m-0 text-[13px] font-semibold lowercase text-fg">
              ₹1,45,000 is sealed for you. start the live inspection to get paid.
            </p>
            <NeoButton
              variant="paccha"
              size="md"
              fullWidth
              icon={Video}
              onClick={() =>
                dispatch({ type: "FSM_TRANSITION", action: "START_ASSAY", actor: "seller" })
              }
            >
              go live
            </NeoButton>
          </div>
        ) : null}
      </div>

      {/* Quick-reply chips */}
      <div className="mb-2 flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {quickList.map((q) => (
          <button
            key={q.label}
            type="button"
            onClick={() => handleSend(q.text)}
            className="shrink-0 px-3 py-1 text-[11.5px] font-medium lowercase text-fg-2 bg-card-2 cursor-pointer press"
            style={{
              borderRadius: "999px",
              border: "1px solid var(--hairline)",
            }}
          >
            {q.label.toLowerCase()}
          </button>
        ))}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(draft || quickList[0]?.text || "");
        }}
        className="flex h-[48px] items-center gap-2 px-3"
        style={{
          borderRadius: "999px",
          backgroundColor: "var(--card-3)",
          border: "1px solid var(--hairline)",
        }}
      >
        <Languages size={18} strokeWidth={1.5} className="shrink-0 text-muted" aria-hidden="true" />
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={isBuyer ? "type in தமிழ்…" : "type in हिन्दी…"}
          aria-label={isBuyer ? "Type message in Tamil" : "Type message in Hindi"}
          className="flex-1 bg-transparent border-0 text-[13.5px] text-fg placeholder:text-muted focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Send message"
          className="flex size-[40px] shrink-0 items-center justify-center rounded-full bg-neo-paccha text-paccha-ink border-0 cursor-pointer press"
        >
          <ArrowUp size={18} strokeWidth={2} aria-hidden="true" />
        </button>
      </form>

      {/* Primary CTA for Buyer when CREATED */}
      {isBuyer && state.fsm === "CREATED" ? (
        <div className="mt-3">
          <NeoButton
            variant="purple"
            size="md"
            fullWidth
            onClick={() => dispatch({ type: "NAV_BUYER", screen: "B3" })}
          >
            <span className="num">lock ₹1,45,000 in escrow</span>
          </NeoButton>
        </div>
      ) : null}
    </div>
  );
}
