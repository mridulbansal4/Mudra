import { useEffect, useState } from "react";
import { Link } from "react-router";

// Deterministic 7x7 QR-style pattern from fixed seed
const QR_BITS = [
  1, 1, 1, 0, 1, 1, 1,
  1, 0, 1, 1, 1, 0, 1,
  1, 1, 1, 0, 1, 1, 1,
  0, 1, 0, 1, 0, 1, 0,
  1, 1, 1, 1, 0, 0, 1,
  1, 0, 1, 0, 1, 1, 0,
  1, 1, 1, 0, 1, 0, 1,
] as const;

export function FloatingDemoCard() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > window.innerHeight * 0.6);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <Link
      to="/demo"
      aria-label="open the two-phone demo"
      className={`hidden sm:inline-flex fixed bottom-[24px] right-[24px] z-30 items-center gap-3.5 no-underline transition-all duration-300 press ${
        visible
          ? "translate-y-0 opacity-100 pointer-events-auto"
          : "translate-y-4 opacity-0 pointer-events-none"
      }`}
      style={{
        border: "1px solid #3d3d3d",
        backgroundColor: "rgba(13, 13, 13, 0.85)",
        backdropFilter: "blur(12px)",
        padding: "14px 18px",
        borderRadius: 0,
      }}
    >
      <div
        aria-hidden="true"
        className="grid size-[48px] grid-cols-7 grid-rows-7 p-1 bg-pop-void"
        style={{ border: "1px solid rgba(255,255,255,0.12)" }}
      >
        {QR_BITS.map((b, i) => (
          <span
            key={i}
            style={{ backgroundColor: b ? "#ffffff" : "#000000" }}
          />
        ))}
      </div>
      <div className="flex flex-col text-[13px] font-semibold lowercase leading-[1.3] text-fg">
        <span>open the</span>
        <span>two-phone demo</span>
      </div>
    </Link>
  );
}
