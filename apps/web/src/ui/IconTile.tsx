import type { LucideIcon } from "lucide-react";

export interface IconTileProps {
  icon: LucideIcon;
  label: string;
  badge?: string;
  onClick?: () => void;
  className?: string;
}

export function IconTile({ icon: Icon, label, badge, onClick, className = "" }: IconTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex flex-col items-center gap-[10px] bg-transparent border-0 p-0 cursor-pointer select-none transition-transform duration-[120ms] active:scale-[0.94] ${className}`}
    >
      <span
        className="relative flex size-16 items-center justify-center rounded-full"
        style={{
          backgroundColor: "var(--card-3)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 0 0 1px rgba(255,255,255,0.04)",
        }}
      >
        <Icon size={24} strokeWidth={1.5} color="#e6e6e6" aria-hidden="true" />
      </span>
      {badge ? (
        <span
          className="num -mt-3 font-bold"
          style={{
            backgroundColor: "#1f2a10",
            color: "var(--neo-paccha)",
            fontSize: "10px",
            padding: "2px 6px",
            borderRadius: "999px",
            lineHeight: 1.2,
          }}
        >
          {badge}
        </span>
      ) : null}
      <span className="text-[12px] font-medium lowercase text-fg-2 leading-none">{label}</span>
    </button>
  );
}
