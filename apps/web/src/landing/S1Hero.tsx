import { useEffect, useRef, useState } from "react";
import { ArrowRight, Download, type LucideIcon } from "lucide-react";
import { motion, useScroll, useTransform } from "motion/react";
import { ANDROID_RELEASE } from "../config/release";
import { Corridor } from "../hero/Corridor";
import { HeroAppPhone } from "../hero/HeroAppPhone";
import { ease, useReducedMotion } from "../motion/hooks";
import { NeoButton } from "../ui/NeoButton";

function GitHubMark({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

export function S1Hero() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const reduced = Boolean(useReducedMotion());
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const update = () => setIsDesktop(window.innerWidth >= 1024);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

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
      className="relative flex min-h-svh lg:h-svh lg:min-h-[720px] w-full flex-col items-center justify-center overflow-x-clip lg:overflow-hidden bg-pop-void px-4 sm:px-6 pt-28 pb-16 lg:py-0 md:px-10"
    >
      <Corridor
        scale={corridorScale}
        y={corridorY}
        glowOpacity={glowOpacity}
      />

      {/* Centered Foreground */}
      <motion.div
        style={reduced || !isDesktop ? undefined : { opacity: headlineOpacity, y: headlineY }}
        className="relative z-10 mx-auto flex w-full max-w-[1200px] flex-col items-center text-center lg:pr-[160px] xl:pr-0"
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
          className="mt-8 sm:mt-9 flex w-full max-w-[330px] sm:max-w-none flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-center gap-3.5 sm:gap-5"
        >
          <NeoButton
            variant="purple"
            size="lg"
            to="/demo"
            icon={ArrowRight}
            className="w-full sm:w-auto"
          >
            try the two-phone demo
          </NeoButton>
          <NeoButton
            variant="paccha"
            size="lg"
            href={ANDROID_RELEASE.arm64ApkUrl}
            download="mudra-v1.0.0-arm64.apk"
            icon={Download}
            className="w-full sm:w-auto"
          >
            download apk
          </NeoButton>
          <div className="grid grid-cols-2 gap-3.5 w-full sm:contents">
            <NeoButton
              variant="ghost"
              size="lg"
              to="/how-it-works"
              className="w-full sm:w-auto !px-4 sm:!px-8"
            >
              how it works
            </NeoButton>
            <NeoButton
              variant="ghost"
              size="lg"
              href={ANDROID_RELEASE.repoUrl}
              target="_blank"
              icon={GitHubMark as unknown as LucideIcon}
              className="w-full sm:w-auto !px-4 sm:!px-8"
            >
              github
            </NeoButton>
          </div>
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
