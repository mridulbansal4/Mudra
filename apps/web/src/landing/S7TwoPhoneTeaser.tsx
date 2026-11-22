import { useEffect, useMemo, useState } from "react";
import { DealChat } from "../demo/screens/DealChat";
import { replayToStep, type DemoAction } from "../demo/store";
import { FadeUp } from "../motion/FadeUp";
import { useReducedMotion } from "../motion/hooks";
import { Eyebrow } from "../ui/Eyebrow";
import { NeoButton } from "../ui/NeoButton";
import { PhoneFrame } from "../ui/PhoneFrame";

const NOOP_DISPATCH = (_action: DemoAction) => {};

export function S7TwoPhoneTeaser() {
  const reduced = Boolean(useReducedMotion());
  const [loopStep, setLoopStep] = useState<1 | 2>(1);

  useEffect(() => {
    const id = window.setInterval(() => {
      setLoopStep((prev) => (prev === 1 ? 2 : 1));
    }, 2400);
    return () => window.clearInterval(id);
  }, []);

  const step1State = useMemo(() => replayToStep(2, "happy", false), []);
  const step2State = useMemo(() => replayToStep(3, "happy", false), []);
  const activeState = loopStep === 1 ? step1State : step2State;

  return (
    <section className="relative w-full bg-pop-black py-[96px] md:py-[160px] px-5 md:px-10 overflow-hidden">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-12 lg:grid-cols-12">
        {/* Left text */}
        <FadeUp className="lg:col-span-5">
          <Eyebrow dot>SEE IT FROM BOTH SIDES</Eyebrow>
          <h2 className="t-h1 mt-4 lowercase text-fg">
            <span className="block">two people.</span>
            <span className="block">two screens.</span>
            <span className="block">one truth.</span>
          </h2>
          <p className="t-lead mt-5 lowercase text-fg-2">
            watch rajesh in tirupur and vikram in ludhiana close a{" "}
            <span className="num">₹1.45</span> lakh deal, each in their own
            language, each on their own phone.
          </p>
          <div className="mt-8">
            <NeoButton variant="paccha" size="lg" to="/demo">
              watch the animated two-phone preview
            </NeoButton>
          </div>
        </FadeUp>

        {/* Right two phones (scale 0.62 each, overlapping by 40px, tilted ±8deg) + SVG sync arc */}
        <div
          role="img"
          aria-label="Two synchronized phones showing Rajesh's Tamil message and Vikram's Hindi translation"
          className="relative flex items-center justify-center lg:col-span-7 pointer-events-none select-none"
        >
          {/* Animated paccha sync arc above/between the phones */}
          <svg
            aria-hidden="true"
            viewBox="0 0 360 80"
            className="pointer-events-none absolute -top-6 z-30 h-[80px] w-[300px] sm:w-[360px]"
            fill="none"
          >
            <style>{`
              @keyframes sync-arc-dash {
                from { stroke-dashoffset: 32; }
                to { stroke-dashoffset: 0; }
              }
            `}</style>
            <path
              d="M 40 68 Q 180 4 320 68"
              stroke="#e5fe40"
              strokeWidth="2"
              strokeDasharray="6 10"
              style={{
                animation: reduced ? "none" : "sync-arc-dash 1.2s linear infinite",
              }}
            />
          </svg>

          <div className="flex items-center justify-center scale-[0.76] sm:scale-100 origin-center">
            <div className="-mr-[20px] z-10">
              <PhoneFrame
                scale={0.62}
                tilt={{ x: 0, y: 8, z: 0 }}
                label={
                  <>
                    rajesh · <span lang="ta">தமிழ்</span>
                  </>
                }
              >
                <DealChat
                  state={activeState}
                  dispatch={NOOP_DISPATCH}
                  viewer="buyer"
                />
              </PhoneFrame>
            </div>

            <div className="-ml-[20px] z-20">
              <PhoneFrame
                scale={0.62}
                tilt={{ x: 0, y: -8, z: 0 }}
                label={
                  <>
                    vikram · <span lang="hi">हिन्दी</span>
                  </>
                }
              >
                <DealChat
                  state={activeState}
                  dispatch={NOOP_DISPATCH}
                  viewer="seller"
                />
              </PhoneFrame>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
