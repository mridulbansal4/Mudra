import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import {
  ArrowUpRight,
  BookOpen,
  ChartNoAxesColumn,
  FlaskConical,
  Siren,
  Swords,
  type LucideIcon,
} from "lucide-react";
import { motion, useScroll, useTransform } from "motion/react";
import { FadeUp } from "../motion/FadeUp";
import { useReducedMotion } from "../motion/hooks";

interface RailCardDef {
  title: string;
  body: string;
  to: string;
  icon: LucideIcon;
  mesh: string;
}

const RAIL_CARDS: RailCardDef[] = [
  {
    title: "bargain arena",
    body: "haggle against an ai seller trained on real mandi prices.",
    to: "/arena",
    icon: Swords,
    mesh: "radial-gradient(circle at 50% 45%, rgba(106,53,255,0.16), transparent 70%)",
  },
  {
    title: "live sandbox",
    body: "a real split-screen deal, wired to the actual escrow engine.",
    to: "/sandbox",
    icon: FlaskConical,
    mesh: "radial-gradient(circle at 50% 45%, rgba(229,254,64,0.14), transparent 70%)",
  },
  {
    title: "dispatch desk",
    body: "where arbitrators catch frozen deals and rule in ninety seconds.",
    to: "/dispatch",
    icon: Siren,
    mesh: "radial-gradient(circle at 50% 45%, rgba(255,135,68,0.15), transparent 70%)",
  },
  {
    title: "sdk guide",
    body: "how we used every nexconn channel type, with code.",
    to: "/guide",
    icon: BookOpen,
    mesh: "radial-gradient(circle at 50% 45%, rgba(124,196,255,0.14), transparent 70%)",
  },
  {
    title: "traction",
    body: "real numbers from real test deals.",
    to: "/traction",
    icon: ChartNoAxesColumn,
    mesh: "radial-gradient(circle at 50% 45%, rgba(255,255,255,0.12), transparent 70%)",
  },
];

function RailCardItem({ card }: { card: RailCardDef }) {
  const Icon = card.icon;
  return (
    <Link
      to={card.to}
      className="group relative flex h-[520px] w-[340px] sm:w-[380px] shrink-0 snap-start flex-col justify-between overflow-hidden border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.16)] p-8 no-underline transition-[transform,border-color] duration-300 hover:-translate-y-[6px]"
      style={{
        borderRadius: "28px",
        backgroundColor: "var(--card)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.06), 0 30px 80px rgba(0,0,0,0.6)",
      }}
    >
      {/* Top 60% visual area with 96px strokeWidth 1 icon on card-specific dark mesh */}
      <div
        aria-hidden="true"
        className="relative flex h-[60%] w-full items-center justify-center rounded-[20px]"
        style={{ background: card.mesh }}
      >
        <Icon
          size={96}
          strokeWidth={1}
          className="text-fg transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      {/* Bottom 40%: title + body + 40px ArrowUpRight circle */}
      <div className="relative flex flex-col justify-end pr-12">
        <h3 className="t-h2 lowercase text-fg">{card.title}</h3>
        <p className="t-body mt-2 lowercase text-fg-2">{card.body}</p>

        <span
          aria-hidden="true"
          className="absolute right-0 bottom-0 flex size-[40px] items-center justify-center rounded-full text-fg transition-transform duration-300 group-hover:rotate-45"
          style={{
            backgroundColor: "var(--card-2)",
            border: "1px solid var(--hairline)",
          }}
        >
          <ArrowUpRight size={20} strokeWidth={1.5} />
        </span>
      </div>
    </Link>
  );
}

export function S6HorizontalRail() {
  const stickyRef = useRef<HTMLDivElement | null>(null);
  const reduced = Boolean(useReducedMotion());
  const [maxShift, setMaxShift] = useState(960);
  const [mounted, setMounted] = useState(false);

  // Lazy-mount S6 rail until within 1 viewport (§9.7)
  useEffect(() => {
    const el = stickyRef.current;
    if (!el) {
      setMounted(true);
      return;
    }
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

  useEffect(() => {
    const update = () => {
      // 5 cards * 380px + 4 gaps * 24px = 1996px track width
      const trackWidth = 5 * 380 + 4 * 24;
      const visible = Math.min(1200, window.innerWidth - 80);
      setMaxShift(Math.max(0, trackWidth - visible));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const { scrollYProgress } = useScroll({
    target: stickyRef,
    offset: ["start start", "end end"],
  });

  const x = useTransform(scrollYProgress, [0, 1], [0, -maxShift]);

  return (
    <section className="relative w-full bg-pop-black py-[96px] md:py-0">
      {/* Desktop sticky 300vh horizontal scroll rail */}
      <div ref={stickyRef} className="hidden md:block relative h-[300vh] w-full">
        <div className="sticky top-0 flex h-svh w-full flex-col justify-center overflow-hidden px-10">
          <div className="mx-auto w-full max-w-[1200px]">
            <FadeUp>
              <h2 className="t-h1 lowercase text-fg">
                <span className="block">do more with</span>
                <span className="block">every deal</span>
              </h2>
            </FadeUp>

            <motion.div
              style={{
                x: reduced ? 0 : x,
                willChange: "transform",
              }}
              className="mt-12 flex items-stretch gap-6"
            >
              {(mounted ? RAIL_CARDS : RAIL_CARDS.slice(0, 3)).map((card) => (
                <RailCardItem key={card.to} card={card} />
              ))}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Mobile native horizontal scroll with scroll-snap-type: x mandatory */}
      <div className="md:hidden px-5">
        <h2 className="t-h1 lowercase text-fg">
          <span className="block">do more with</span>
          <span className="block">every deal</span>
        </h2>

        <div
          className="no-scrollbar mt-8 flex gap-4 overflow-x-auto pb-4"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {RAIL_CARDS.map((card) => (
            <RailCardItem key={card.to} card={card} />
          ))}
        </div>
      </div>
    </section>
  );
}
