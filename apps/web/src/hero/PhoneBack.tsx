import type { CSSProperties } from "react";

export interface PhoneBackProps {
  scale?: number;
  className?: string;
  style?: CSSProperties;
}

export function PhoneBack({ scale = 0.6, className = "", style }: PhoneBackProps) {
  const lensStyle: CSSProperties = {
    width: "34px",
    height: "34px",
    borderRadius: "999px",
    background: "radial-gradient(circle, #0a0a0a 40%, #2a2a2a 42%, #111 70%)",
    boxShadow: "0 2px 6px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.08)",
  };

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none ${className}`}
      style={{
        width: "300px",
        height: "620px",
        borderRadius: "48px",
        backgroundColor: "#1c1c1e",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 30px 60px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.06)",
        transform: `scale(${scale})`,
        transformOrigin: "center center",
        ...style,
      }}
    >
      {/* 3-lens camera bump cluster top-left */}
      <div
        className="relative m-5 p-3"
        style={{
          width: "102px",
          height: "106px",
          borderRadius: "26px",
          backgroundColor: "#151517",
          border: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "0 8px 18px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        <div className="absolute left-3 top-3" style={lensStyle} />
        <div className="absolute left-3 bottom-3" style={lensStyle} />
        <div className="absolute right-3 top-1/2 -translate-y-1/2" style={lensStyle} />
        <div
          className="absolute right-5 top-3.5 size-3 rounded-full"
          style={{ backgroundColor: "#3a3528", opacity: 0.7 }}
        />
      </div>
    </div>
  );
}
