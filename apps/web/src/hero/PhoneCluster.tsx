import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { BuyerHome } from "../demo/screens/BuyerHome";
import { DealChat } from "../demo/screens/DealChat";
import { SellerLive } from "../demo/screens/SellerLive";
import { replayToStep, type DemoAction } from "../demo/store";
import { useReducedMotion } from "../motion/hooks";
import { PhoneFrame } from "../ui/PhoneFrame";
import { PhoneBack } from "./PhoneBack";

const NOOP_DISPATCH = (_action: DemoAction) => {};

export function PhoneCluster() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const reduced = Boolean(useReducedMotion());

  const b1State = useMemo(() => replayToStep(0, "happy", false), []);
  const b2State = useMemo(() => replayToStep(2, "happy", false), []);
  const s3State = useMemo(() => replayToStep(6, "happy", false), []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const leftSpreadX = useTransform(scrollYProgress, [0, 0.5, 1], [0, -40, -40]);
  const rightSpreadX = useTransform(scrollYProgress, [0, 0.5, 1], [0, 40, 40]);
  const leftRotY = useTransform(scrollYProgress, [0, 0.5, 1], [28, 12, 12]);
  const rightRotY = useTransform(scrollYProgress, [0, 0.5, 1], [-28, -12, -12]);
  const centerLiftY = useTransform(scrollYProgress, [0, 0.5, 1], [40, 0, 0]);

  // Desktop pointer parallax (±3deg, lerped 0.08 per frame)
  const [pointerTilt, setPointerTilt] = useState({ x: 0, y: 0 });
  useEffect(() => {
    if (reduced) return;
    if (typeof window === "undefined") return;
    const fine = window.matchMedia("(pointer: fine)").matches;
    if (!fine) return;

    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let rafId = 0;

    const onMove = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      target.y = nx * 3;
      target.x = -ny * 3;
    };

    const tick = () => {
      current.x += (target.x - current.x) * 0.08;
      current.y += (target.y - current.y) * 0.08;
      setPointerTilt({
        x: Number(current.x.toFixed(2)),
        y: Number(current.y.toFixed(2)),
      });
      rafId = window.requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    rafId = window.requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.cancelAnimationFrame(rafId);
    };
  }, [reduced]);

  // Responsive scale wrapper on screens narrower than 1140px
  const [clusterScale, setClusterScale] = useState(1);
  useEffect(() => {
    const update = () => {
      const vw = window.innerWidth;
      if (vw < 1140) {
        setClusterScale(Number(Math.max(0.32, (vw - 32) / 1100).toFixed(2)));
      } else {
        setClusterScale(1);
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label="Samadhan app screens showing buyer home, bilingual deal chat, and live seller video inspection"
      className="relative mx-auto flex w-full items-start justify-center overflow-visible"
      style={{
        height: `${Math.round(720 * clusterScale)}px`,
      }}
    >
      <div
        className="relative shrink-0 pointer-events-none select-none"
        style={{
          width: "1100px",
          height: "720px",
          transform: `perspective(1400px) scale(${clusterScale}) rotateX(${pointerTilt.x}deg) rotateY(${pointerTilt.y}deg)`,
          transformOrigin: "top center",
        }}
      >
        {/* Far-left PhoneBack silhouette (0.6 scale) */}
        <div
          aria-hidden="true"
          className="absolute z-0"
          style={{ left: "-24px", top: "70px", opacity: 0.85 }}
        >
          <PhoneBack scale={0.6} />
        </div>

        {/* Far-right PhoneBack silhouette (0.6 scale) */}
        <div
          aria-hidden="true"
          className="absolute z-0"
          style={{ right: "-24px", top: "110px", opacity: 0.85 }}
        >
          <PhoneBack scale={0.6} />
        </div>

        {/* Left-back phone (scale 0.72, left 6%, top 60px, tilt {x:4,y:28,z:-6}, brightness 0.7) */}
        <motion.div
          aria-hidden="true"
          style={
            reduced
              ? {
                  left: "6%",
                  top: "60px",
                  filter: "brightness(0.7)",
                  transform: "perspective(1200px) rotateX(4deg) rotateY(12deg) rotateZ(-6deg)",
                }
              : {
                  left: "6%",
                  top: "60px",
                  transformPerspective: 1200,
                  x: leftSpreadX,
                  rotateX: 4,
                  rotateY: leftRotY,
                  rotateZ: -6,
                  filter: "brightness(0.7)",
                }
          }
          className="absolute z-10"
        >
          <PhoneFrame scale={0.72}>
            <DealChat state={b2State} dispatch={NOOP_DISPATCH} viewer="buyer" />
          </PhoneFrame>
        </motion.div>

        {/* Right-back phone (scale 0.72, right 6%, top 120px, tilt {x:4,y:-28,z:6}, brightness 0.7) */}
        <motion.div
          aria-hidden="true"
          style={
            reduced
              ? {
                  right: "6%",
                  top: "120px",
                  filter: "brightness(0.7)",
                  transform: "perspective(1200px) rotateX(4deg) rotateY(-12deg) rotateZ(6deg)",
                }
              : {
                  right: "6%",
                  top: "120px",
                  transformPerspective: 1200,
                  x: rightSpreadX,
                  rotateX: 4,
                  rotateY: rightRotY,
                  rotateZ: 6,
                  filter: "brightness(0.7)",
                }
          }
          className="absolute z-10"
        >
          <PhoneFrame scale={0.72}>
            <SellerLive state={s3State} dispatch={NOOP_DISPATCH} />
          </PhoneFrame>
        </motion.div>

        {/* Center phone (scale 0.82, tilt {x:0,y:0,z:0}) showing Buyer Home B1 */}
        <motion.div
          aria-hidden="true"
          style={reduced ? undefined : { y: centerLiftY }}
          className="absolute left-1/2 top-0 z-20 -translate-x-1/2"
        >
          <PhoneFrame scale={0.82}>
            <BuyerHome state={b1State} dispatch={NOOP_DISPATCH} />
          </PhoneFrame>
        </motion.div>
      </div>
    </div>
  );
}
