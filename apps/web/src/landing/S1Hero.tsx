import { useRef } from "react";
import { ArrowRight, Download } from "lucide-react";
import { motion, useScroll, useTransform } from "motion/react";
import { ANDROID_RELEASE } from "../config/release";
import { Corridor } from "../hero/Corridor";
import { HeroAppPhone } from "../hero/HeroAppPhone";
import { ease, useReducedMotion } from "../motion/hooks";
import { NeoButton } from "../ui/NeoButton";

export function S1Hero() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const reduced = Boolean(useReducedMotion());

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const corridorScale = useTransform(scrollYProgress, [0, 1], [1, 1.35]);
  const corridorY = useTransform(scrollYProgress, [0, 1], ["0vh", "-6vh"]);
  const glowOpacity = useTransform(scrollYProgress, [0, 1], [0.22, 0.55]);
  const headlineOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const headlineY = useTransform(scrollYProgress, [0, 0.75], [0, -60]);

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-svh lg:h-svh lg:min-h-[720px] w-full flex-col items-center justify-center overflow-x-clip lg:overflow-hidden bg-pop-void px-5 pt-24 pb-28 lg:py-0 md:px-10"
    >
      <Corridor
        scale={corridorScale}
        y={corridorY}
        glowOpacity={glowOpacity}
      />

      {/* Centered Foreground */}
      <motion.div
        style={reduced ? undefined : { opacity: headlineOpacity, y: headlineY }}
        className="relative z-10 mx-auto flex max-w-[1200px] flex-col items-center text-center lg:pr-[160px] xl:pr-0"
      >
        <h1 className="t-hero lowercase text-fg">
          <motion.span
            initial={
              reduced
                ? { opacity: 1, y: 0, filter: "blur(0px)" }
                : { opacity: 0, y: 30, filter: "blur(8px)" }
            }
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.9, ease: ease.expoOut }}
            className="block"
          >
            trade like you
          </motion.span>
          <motion.span
            initial={
              reduced
                ? { opacity: 1, y: 0, filter: "blur(0px)" }
                : { opacity: 0, y: 30, filter: "blur(8px)" }
            }
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.9, delay: 0.12, ease: ease.expoOut }}
            className="block"
          >
            trust them.
          </motion.span>
        </h1>

        <motion.p
          initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.24, ease: ease.expoOut }}
          className="t-lead mt-5 max-w-[440px] lowercase text-fg-2"
        >
          mudra is the members-only escrow room where buyers and sellers inspect
          live, pay safely and settle disputes in ninety seconds, in their own
          language.
        </motion.p>

        <motion.div
          initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: ease.expoOut }}
          className="mt-9 flex flex-wrap items-center justify-center gap-5"
        >
          <NeoButton variant="purple" size="lg" to="/demo" icon={ArrowRight}>
            try the two-phone demo
          </NeoButton>
          <NeoButton
            variant="paccha"
            size="lg"
            href={ANDROID_RELEASE.arm64ApkUrl}
            download="mudra-v1.0.0-arm64.apk"
            icon={Download}
          >
            download apk
          </NeoButton>
          <NeoButton variant="ghost" size="lg" to="/how-it-works">
            how it works
          </NeoButton>
        </motion.div>
      </motion.div>

      {/* 3D Corner Phone App Launcher */}
      <HeroAppPhone scrollProgress={scrollYProgress} />

      {/* Bottom scroll cue */}
      <div className="mt-10 lg:mt-0 lg:absolute lg:bottom-6 lg:left-1/2 z-10 flex lg:-translate-x-1/2 flex-col items-center gap-2">
        <span className="eyebrow">SCROLL</span>
        <div
          aria-hidden="true"
          className="relative h-[48px] w-[1px] overflow-hidden"
          style={{ backgroundColor: "rgba(255,255,255,0.16)" }}
        >
          <style>{`
            @keyframes hero-scroll-segment {
              0% { transform: translateY(-12px); }
              100% { transform: translateY(48px); }
            }
          `}</style>
          <span
            className="block h-[12px] w-[1px] bg-neo-paccha"
            style={{
              animation: "hero-scroll-segment 1.6s linear infinite",
            }}
          />
        </div>
      </div>
    </section>
  );
}
