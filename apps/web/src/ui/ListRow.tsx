import { ChevronRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export interface ListRowProps {
  icon?: LucideIcon;
  label: ReactNode;
  value?: ReactNode;
  delta?: ReactNode;
  showChevron?: boolean;
  onClick?: () => void;
  className?: string;
}

export function ListRow({
  icon: Icon,
  label,
  value,
  delta,
  showChevron = true,
  onClick,
  className = "",
}: ListRowProps) {
  const content = (
    <>
      <span className="flex items-center gap-3 min-w-0">
        {Icon ? (
          <Icon size={20} strokeWidth={1.5} className="shrink-0 text-fg-2" aria-hidden="true" />
        ) : null}
        <span className="text-[14px] font-medium text-fg truncate">{label}</span>
      </span>
      <span className="flex items-center gap-2.5 shrink-0">
        {delta ? <span className="num text-[12px] font-semibold text-neo-paccha">{delta}</span> : null}
        {value !== undefined ? (
          <span className="num text-[15px] font-bold text-fg">{value}</span>
        ) : null}
        {showChevron ? (
          <ChevronRight size={16} strokeWidth={1.5} className="text-muted" aria-hidden="true" />
        ) : null}
      </span>
    </>
  );

  const rowClass = `flex h-[56px] w-full items-center justify-between px-4 bg-transparent border-0 text-left ${
    onClick ? "cursor-pointer hover:bg-card-2 press" : ""
  } ${className}`;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={rowClass}>
        {content}
      </button>
    );
  }

  return <div className={rowClass}>{content}</div>;
}

export function ListGroup({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`overflow-hidden divide-y divide-[var(--hairline)] ${className}`}
      style={{
        borderRadius: "20px",
        backgroundColor: "var(--card)",
        border: "1px solid var(--hairline)",
      }}
    >
      {children}
    </div>
  );
}
