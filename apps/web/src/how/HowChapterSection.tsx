import { useMemo, useState } from "react";
import { ArbiterDesk } from "../demo/screens/ArbiterDesk";
import { DealChat } from "../demo/screens/DealChat";
import { EscrowSheet } from "../demo/screens/EscrowSheet";
import { Freeze } from "../demo/screens/Freeze";
import { LiveInspection } from "../demo/screens/LiveInspection";
import { Receipt } from "../demo/screens/Receipt";
import { SellerAwaitingRelease, SellerLive } from "../demo/screens/SellerLive";
import { SellerPaid } from "../demo/screens/SellerPaid";
import { replayToStep, type DemoAction } from "../demo/store";
import { FadeUp } from "../motion/FadeUp";
import { Eyebrow } from "../ui/Eyebrow";
import { PhoneFrame } from "../ui/PhoneFrame";
import { SegmentedControl } from "../ui/SegmentedControl";
import type { ChapterPerspective, HowChapterDef } from "./chapters";

const NOOP_DISPATCH = (_action: DemoAction) => {};

export interface HowChapterSectionProps {
  chapter: HowChapterDef;
  index: number;
  registerRef: (el: HTMLElement | null) => void;
}

export function HowChapterSection({
  chapter,
  index,
  registerRef,
}: HowChapterSectionProps) {
  const [perspective, setPerspective] = useState<ChapterPerspective>("buyer");
  const isOdd = index % 2 === 1;

  const createdState = useMemo(() => replayToStep(2, "happy", false), []);
  const fundedBuyerState = useMemo(() => replayToStep(3, "happy", false), []);
  const fundedSellerState = useMemo(() => replayToStep(4, "happy", false), []);
  const liveState = useMemo(
    () => ({ ...replayToStep(6, "happy", false), incomingCallBanner: false }),
    []
  );
  const verifiedState = useMemo(() => replayToStep(7, "happy", false), []);
  const releasedState = useMemo(() => replayToStep(8, "happy", false), []);
  const disputeState = useMemo(() => replayToStep(7, "dispute", false), []);

  const options = useMemo(
    () =>
      chapter.perspectives.map((p) => ({
        value: p,
        label: p,
      })),
    [chapter.perspectives]
  );

  const renderPhoneContent = () => {
    switch (index) {
      case 0: // created: B2 / S2
        return (
          <DealChat
            state={createdState}
            dispatch={NOOP_DISPATCH}
            viewer={perspective === "seller" ? "seller" : "buyer"}
          />
        );
      case 1: // funded: B3 / S2-funded
        return perspective === "seller" ? (
          <DealChat
            state={fundedSellerState}
            dispatch={NOOP_DISPATCH}
            viewer="seller"
          />
        ) : (
          <EscrowSheet state={fundedBuyerState} dispatch={NOOP_DISPATCH} />
        );
      case 2: // inspection live: B4 / S3
        return perspective === "seller" ? (
          <SellerLive state={liveState} dispatch={NOOP_DISPATCH} />
        ) : (
          <LiveInspection state={liveState} dispatch={NOOP_DISPATCH} />
        );
      case 3: // assay verified: B5 / S4
        return perspective === "seller" ? (
          <SellerAwaitingRelease state={verifiedState} />
        ) : (
          <Receipt state={verifiedState} dispatch={NOOP_DISPATCH} />
        );
      case 4: // released: B5-released / S5
        return perspective === "seller" ? (
          <SellerPaid />
        ) : (
          <Receipt state={releasedState} dispatch={NOOP_DISPATCH} />
        );
      default: // dispute: B6 / S6 / A1
        if (perspective === "arbitrator") {
          return <ArbiterDesk state={disputeState} dispatch={NOOP_DISPATCH} />;
        }
        return (
          <Freeze
            state={disputeState}
            dispatch={NOOP_DISPATCH}
            viewer={perspective === "seller" ? "seller" : "buyer"}
          />
        );
    }
  };

  return (
    <section
      id={chapter.id}
      ref={registerRef}
      data-chapter-idx={index}
      className="relative flex min-h-[120svh] w-full items-center bg-pop-black py-20 px-5 md:px-10"
      style={{ borderBottom: "1px solid var(--hairline)" }}
    >
      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 items-center gap-12 lg:grid-cols-12">
        {/* Text column */}
        <FadeUp
          className={`lg:col-span-6 ${
            isOdd ? "lg:order-2 lg:pl-10" : "lg:order-1 lg:pr-10"
          }`}
        >
          <Eyebrow dot>{chapter.eyebrow}</Eyebrow>
          <h2 className="t-h1 mt-4 lowercase text-fg">{chapter.headline}</h2>
          <p className="t-lead mt-5 max-w-[520px] lowercase text-fg-2">
            {chapter.lead}
          </p>

          {/* "what protects you" list of 3 rows (lucide icon 20px + 14px text, hairline dividers) */}
          <div className="mt-8 max-w-[480px]">
            <span className="text-[12px] font-bold lowercase text-muted">what protects you</span>
            <div
              className="mt-3 divide-y divide-[var(--hairline)]"
              style={{
                borderTop: "1px solid var(--hairline)",
                borderBottom: "1px solid var(--hairline)",
              }}
            >
              {chapter.protections.map((row) => {
                const Icon = row.icon;
                return (
                  <div
                    key={row.text}
                    className="flex items-center gap-3.5 py-3.5 text-[14px] font-medium lowercase text-fg"
                  >
                    <Icon
                      size={20}
                      strokeWidth={1.5}
                      className="shrink-0 text-neo-paccha"
                      aria-hidden="true"
                    />
                    <span className="num">{row.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </FadeUp>

        {/* Phone column with buyer | seller (| arbitrator) SegmentedControl */}
        <div
          className={`flex flex-col items-center justify-center gap-5 lg:col-span-6 ${
            isOdd ? "lg:order-1" : "lg:order-2"
          }`}
        >
          <SegmentedControl
            options={options}
            value={perspective}
            onChange={setPerspective}
            ariaLabel={`Perspective for ${chapter.eyebrow.toLowerCase()}`}
          />

          <div
            role="img"
            aria-label={`${chapter.eyebrow.toLowerCase()} phone screen from ${perspective} perspective`}
            className="pointer-events-none select-none"
          >
            <PhoneFrame scale={0.75}>{renderPhoneContent()}</PhoneFrame>
          </div>
        </div>
      </div>
    </section>
  );
}
