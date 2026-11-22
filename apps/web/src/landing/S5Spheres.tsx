import { useEffect, useRef, useState } from "react";
import { useScroll } from "motion/react";
import { GlassSpheres } from "../hero/GlassSpheres";
import { FadeUp } from "../motion/FadeUp";
import { CountUp } from "../ui/CountUp";

interface StatCell {
  target: number;
  decimals: number;
  unit: string;
  caption: string;
}

const STATS: StatCell[] = [
  { target: 1.2, decimals: 1, unit: "ms", caption: "p99 escrow state change" },
  { target: 300, decimals: 0, unit: "µs", caption: "pii scrub before any ai call" },
  { target: 90, decimals: 0, unit: "s", caption: "freeze-to-verdict window" },
  { target: 4, decimals: 0, unit: "", caption: "indian languages, live" },
];

export function S5Spheres() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  // Lazy-mount GlassSpheres until within 1 viewport (§9.7)
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setMounted(true);
          io.disconnect();
        }
      },
      { rootMargin: "100% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="relative h-[140vh] w-full bg-pop-void">
      <div className="sticky top-0 flex h-svh w-full flex-col items-center justify-center overflow-hidden px-5 md:px-10">
        {mounted ? <GlassSpheres progress={scrollYProgress} /> : null}

        <div className="relative z-10 mx-auto flex w-full max-w-[1200px] flex-col items-center text-center">
          <FadeUp>
            <h2 className="t-mega lowercase text-fg">
              <span className="block">every rupee,</span>
              <span className="block">accounted for.</span>
            </h2>
            <p className="t-lead mx-auto mt-6 max-w-[540px] lowercase text-fg-2">
              unlock instant settlement, signed receipts, and a referee who shows
              up in ninety seconds.
            </p>
          </FadeUp>

          {/* 4-item horizontal stat strip with hairline separators (64px gap below lead) */}
          <div
            className="mt-16 grid w-full grid-cols-2 lg:grid-cols-4 text-left"
            style={{
              borderTop: "1px solid var(--hairline)",
              borderBottom: "1px solid var(--hairline)",
              backgroundColor: "rgba(13,13,13,0.68)",
              backdropFilter: "blur(8px)",
            }}
          >
            {STATS.map((item, idx) => (
              <div
                key={item.caption}
                className={`flex flex-col justify-between p-4 sm:p-6 md:p-8 ${
                  idx >= 2 ? "border-t border-[var(--hairline)] lg:border-t-0" : ""
                } ${idx % 2 === 1 ? "border-l border-[var(--hairline)]" : ""} ${
                  idx === 2 ? "lg:border-l lg:border-[var(--hairline)]" : ""
                }`}
              >
                <div className="flex items-baseline gap-1.5">
                  <CountUp
                    target={item.target}
                    decimals={item.decimals}
                    className="t-num-xl text-fg"
                  />
                  {item.unit ? (
                    <span className="num text-[20px] font-semibold lowercase text-muted">
                      {item.unit}
                    </span>
                  ) : null}
                </div>
                <span className="t-small mt-3 lowercase text-muted">
                  {item.caption}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
