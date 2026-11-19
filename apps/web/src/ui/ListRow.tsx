import { ChevronRight, type LucideIcon } from "lucide-react";
import { Children, type ReactNode } from "react";
import { motion } from "motion/react";
import { useReducedMotion } from "../motion/hooks";

export interface ListRowProps {
  icon?: LucideIcon;
  label: ReactNode;
  value?: ReactNode;
  delta?: ReactNode;
  showChevron?: boolean;
  flashPaccha?: boolean;
  onClick?: () => void;
  className?: string;
}

export function ListRow({
  icon: Icon,
  label,
  value,
  delta,
  showChevron = true,
  flashPaccha = false,
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

  const rowClass = `flex h-[56px] w-full items-center justify-between px-4 border-0 text-left transition-colors duration-300 ${
    flashPaccha ? "bg-[rgba(229,254,64,0.12)]" : "bg-transparent"
  } ${onClick ? "cursor-pointer hover:bg-card-2 press" : ""} ${className}`;

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
  const reduced = Boolean(useReducedMotion());
  const items = Children.toArray(children);

  return (
    <div
      className={`overflow-hidden divide-y divide-[var(--hairline)] ${className}`}
      style={{
        borderRadius: "20px",
        backgroundColor: "var(--card)",
        border: "1px solid var(--hairline)",
      }}
    >
      {reduced
        ? items
        : items.map((child, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: idx * 0.04, ease: "easeOut" }}
            >
              {child}
            </motion.div>
          ))}
    </div>
  );
}
