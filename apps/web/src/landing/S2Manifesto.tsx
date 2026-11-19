import { useRef } from "react";
import { ShieldCheck } from "lucide-react";
import { useScroll } from "motion/react";
import { Eyebrow } from "../ui/Eyebrow";
import { RevealText } from "../ui/RevealText";

const MANIFESTO_TEXT =
  "every message is scrubbed of aadhaar, pan and upi ids before any model reads it. every escrow voucher is signed and sealed. there's no room for a quiet edit because we didn't leave any.";

export function S2Manifesto() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  return (
    <section ref={sectionRef} className="relative h-[220vh] w-full bg-pop-black">
      <div className="sticky top-0 flex h-svh w-full flex-col items-center justify-center px-5 md:px-10">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center text-center">
          {/* ShieldCheck icon 36px inside 64x72 shield outline (LogoMark outer path only, stroke #fff) */}
          <div className="relative flex h-[72px] w-[64px] items-center justify-center">
            <svg
              aria-hidden="true"
              viewBox="0 0 64 72"
              width={64}
              height={72}
              fill="none"
              className="absolute inset-0"
            >
              <path
                d="M6 6h52v34c0 13-11 22-26 28C17 62 6 53 6 40V6z"
                stroke="#ffffff"
                strokeWidth="3.5"
                strokeLinejoin="miter"
              />
            </svg>
            <ShieldCheck size={36} strokeWidth={1.5} className="relative z-10 text-fg" />
          </div>

          <Eyebrow className="mt-5 justify-center text-center !text-fg">
            YOUR DEAL ISN'T OUR BUSINESS. KEEPING IT FAIR IS.
          </Eyebrow>

          <RevealText
            text={MANIFESTO_TEXT}
            progress={scrollYProgress}
            boldLastWords={6}
            className="mt-8 max-w-[980px] text-center lowercase"
          />
        </div>
      </div>
    </section>
  );
}
