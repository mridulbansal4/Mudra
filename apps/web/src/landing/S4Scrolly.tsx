import { useEffect, useMemo, useRef, useState } from "react";
import {
  Fan,
  Gauge,
  Languages,
  Scale,
  ScanLine,
  ShieldCheck,
  Snowflake,
  Vault,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion, useScroll, useTransform } from "motion/react";
import { DealChat } from "../demo/screens/DealChat";
import { EscrowSheet } from "../demo/screens/EscrowSheet";
import { Freeze } from "../demo/screens/Freeze";
import { LiveInspection } from "../demo/screens/LiveInspection";
import { replayToStep, type DemoAction } from "../demo/store";
import { FadeUp } from "../motion/FadeUp";
import { ease, useReducedMotion } from "../motion/hooks";
import { Eyebrow } from "../ui/Eyebrow";
import { PhoneFrame } from "../ui/PhoneFrame";

const NOOP_DISPATCH = (_action: DemoAction) => {};

interface ScrollyStepDef {
  num: string;
  title: string;
  body: string;
  chips: { icon: LucideIcon; label: string }[];
  ariaScreen: string;
}

const STEPS: ScrollyStepDef[] = [
  {
    num: "01",
    title: "talk in your language.",
    body: "rajesh types tamil, vikram reads hindi. every bubble shows the original and the translation, side by side.",
    chips: [
      { icon: Languages, label: "4 languages" },
      { icon: ShieldCheck, label: "pii scrubbed" },
    ],
    ariaScreen: "Bilingual deal chat screen showing Tamil and Hindi messages",
  },
  {
    num: "02",
    title: "lock it in escrow.",
    body: "one swipe moves ₹1,45,000 into a sealed vault. the seller sees it's real; nobody can touch it.",
    chips: [
      { icon: Vault, label: "upi mandate" },
      { icon: Gauge, label: "< 1.2 ms state change" },
    ],
    ariaScreen: "Escrow sheet screen with slide-to-lock ₹1,45,000",
  },
  {
    num: "03",
    title: "inspect it live.",
    body: "the seller shows the machine on video. we fingerprint every frame and listen to the motor — 4,820 rpm, as promised.",
    chips: [
      { icon: ScanLine, label: "frame hash" },
      { icon: Fan, label: "acoustic rpm" },
    ],
    ariaScreen: "Live video inspection screen showing 96% frame match and 4,820 RPM",
  },
  {
    num: "04",
    title: "freeze, don't fight.",
    body: "if something's off, one tap freezes the deal for ninety seconds and an arbitrator settles it, with a signed verdict.",
    chips: [
      { icon: Snowflake, label: "90 s freeze" },
      { icon: Scale, label: "signed verdict" },
    ],
    ariaScreen: "Dispute freeze screen with 90-second countdown ring",
  },
];

export function S4Scrolly() {
  const stickyContainerRef = useRef<HTMLDivElement | null>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const reduced = Boolean(useReducedMotion());

  const step1State = useMemo(() => replayToStep(2, "happy", false), []);
  const step2State = useMemo(() => replayToStep(3, "happy", false), []);
  const step3State = useMemo(
    () => ({ ...replayToStep(6, "happy", false), incomingCallBanner: false }),
    []
  );
  const step4State = useMemo(() => replayToStep(7, "dispute", false), []);

  const { scrollYProgress } = useScroll({
    target: stickyContainerRef,
    offset: ["start start", "end end"],
  });
  const railHeight = useTransform(scrollYProgress, [0, 1], ["15%", "100%"]);

  // IntersectionObserver with rootMargin "-45% 0px -45% 0px" per §7.1 S4
  useEffect(() => {
    const nodes = stepRefs.current.filter((n): n is HTMLDivElement => n !== null);
    if (nodes.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.stepIdx);
            if (!Number.isNaN(idx)) {
              setActiveIndex(idx);
            }
          }
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );

    for (const node of nodes) io.observe(node);
    return () => io.disconnect();
  }, []);

  const renderStepScreen = (idx: number) => {
    switch (idx) {
      case 0:
        return <DealChat state={step1State} dispatch={NOOP_DISPATCH} viewer="buyer" />;
      case 1:
        return (
          <EscrowSheet
            key={`scrolly-b3-${activeIndex === 1 ? "active" : "idle"}`}
            state={step2State}
            dispatch={NOOP_DISPATCH}
            autoLock={activeIndex === 1}
          />
        );
      case 2:
        return <LiveInspection state={step3State} dispatch={NOOP_DISPATCH} />;
      default:
        return <Freeze state={step4State} dispatch={NOOP_DISPATCH} viewer="buyer" />;
    }
  };

  return (
    <section className="relative w-full bg-pop-black py-[96px] md:py-[160px] px-5 md:px-10">
      <div className="mx-auto max-w-[1200px]">
        {/* Section Intro */}
        <FadeUp className="mb-12 md:mb-20">
          <Eyebrow dot>HOW A DEAL FLOWS</Eyebrow>
          <h2 className="t-h1 mt-4 lowercase text-fg">
            <span className="block">four moves.</span>
            <span className="block">zero leaps of faith.</span>
          </h2>
        </FadeUp>

        {/* Desktop (>= 900px): 400vh sticky scrollytelling */}
        <div
          ref={stickyContainerRef}
          className="relative hidden min-[900px]:grid min-[900px]:h-[400vh] min-[900px]:grid-cols-[45%_55%]"
        >
          {/* Left 2px progress rail (height 60vh) inside sticky track */}
          <div className="relative pl-6">
            <div className="sticky top-[20vh] left-0 float-left -ml-6 h-[60vh] w-[2px] bg-dim">
              <motion.div
                className="w-full bg-neo-paccha"
                style={{ height: reduced ? "100%" : railHeight }}
              />
            </div>

            {STEPS.map((step, idx) => {
              const isActive = activeIndex === idx;
              return (
                <div
                  key={step.num}
                  ref={(el) => {
                    stepRefs.current[idx] = el;
                  }}
                  data-step-idx={idx}
                  className="flex min-h-svh flex-col justify-center pr-8 transition-opacity duration-400"
                  style={{ opacity: isActive ? 1 : 0.25 }}
                >
                  <span
                    className={`t-num-xl num transition-colors duration-400 ${
                      isActive ? "text-neo-paccha" : "text-dim"
                    }`}
                  >
                    {step.num}
                  </span>
                  <h3 className="t-h2 mt-4 lowercase text-fg">{step.title}</h3>
                  <p className="t-lead mt-4 max-w-[440px] lowercase text-fg-2">
                    {step.body}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    {step.chips.map((chip) => {
                      const Icon = chip.icon;
                      return (
                        <span
                          key={chip.label}
                          className="inline-flex items-center gap-2 px-3.5 py-2 text-[12.5px] font-semibold lowercase text-fg-2"
                          style={{
                            borderRadius: "999px",
                            backgroundColor: "var(--card-2)",
                            border: "1px solid var(--hairline)",
                          }}
                        >
                          <Icon size={16} strokeWidth={1.5} className="text-neo-paccha" />
                          <span className="num">{chip.label}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right sticky phone (55% column, scale 0.9, vertically centered) */}
          <div className="relative">
            <div
              role="img"
              aria-label={STEPS[activeIndex]?.ariaScreen}
              className="sticky flex h-svh top-0 items-center justify-center pointer-events-none select-none"
              style={{ willChange: "transform" }}
            >
              <PhoneFrame scale={0.9}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={activeIndex}
                    initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: -16 }}
                    transition={{ duration: 0.45, ease: ease.expoOut }}
                    className="min-h-full w-full"
                  >
                    {renderStepScreen(activeIndex)}
                  </motion.div>
                </AnimatePresence>
              </PhoneFrame>
            </div>
          </div>
        </div>

        {/* Mobile (< 900px): non-sticky, each step renders text then phone (scale 0.7) inline */}
        <div className="flex flex-col gap-20 min-[900px]:hidden">
          {STEPS.map((step, idx) => (
            <div key={step.num} className="flex flex-col items-start">
              <span className="t-num-xl num text-neo-paccha">{step.num}</span>
              <h3 className="t-h2 mt-3 lowercase text-fg">{step.title}</h3>
              <p className="t-lead mt-3 lowercase text-fg-2">{step.body}</p>
              <div className="mt-4 flex flex-wrap gap-2.5">
                {step.chips.map((chip) => {
                  const Icon = chip.icon;
                  return (
                    <span
                      key={chip.label}
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold lowercase text-fg-2"
                      style={{
                        borderRadius: "999px",
                        backgroundColor: "var(--card-2)",
                        border: "1px solid var(--hairline)",
                      }}
                    >
                      <Icon size={15} strokeWidth={1.5} className="text-neo-paccha" />
                      <span className="num">{chip.label}</span>
                    </span>
                  );
                })}
              </div>

              <div
                role="img"
                aria-label={step.ariaScreen}
                className="mt-8 self-center pointer-events-none select-none"
              >
                <PhoneFrame scale={0.7}>{renderStepScreen(idx)}</PhoneFrame>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
