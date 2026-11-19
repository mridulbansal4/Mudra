import type { LucideIcon } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";
import { Link } from "react-router";

export interface NeoButtonProps {
  variant?: "purple" | "paccha" | "white" | "ghost";
  size?: "md" | "lg";
  as?: "button" | "link";
  to?: string;
  icon?: LucideIcon;
  children: ReactNode;
  onClick?: (e: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
  ariaLabel?: string;
}

const VARIANT_STYLES: Record<
  NonNullable<NeoButtonProps["variant"]>,
  { bg: string; text: string; border: string; shadow: string; focusOutline: string }
> = {
  purple: {
    bg: "#6a35ff",
    text: "#ffffff",
    border: "1.5px solid #3f1fa6",
    shadow: "#2e1679",
    focusOutline: "#e5fe40",
  },
  paccha: {
    bg: "#e5fe40",
    text: "#0d0d0d",
    border: "1.5px solid #9fb21f",
    shadow: "#7a8916",
    focusOutline: "#ffffff",
  },
  white: {
    bg: "#ffffff",
    text: "#0d0d0d",
    border: "1.5px solid #bdbdbd",
    shadow: "#8f8f8f",
    focusOutline: "#e5fe40",
  },
  ghost: {
    bg: "transparent",
    text: "#ffffff",
    border: "1.5px solid #3d3d3d",
    shadow: "#3d3d3d",
    focusOutline: "#e5fe40",
  },
};

export function NeoButton({
  variant = "purple",
  size = "md",
  as,
  to,
  icon: Icon,
  children,
  onClick,
  type = "button",
  disabled = false,
  fullWidth = false,
  className = "",
  ariaLabel,
}: NeoButtonProps) {
  const v = VARIANT_STYLES[variant];
  const isLg = size === "lg";
  const heightPx = isLg ? 60 : 48;
  const padX = isLg ? 32 : 24;
  const fontSize = isLg ? 16 : 14;

  const baseClass = [
    "neo-btn group relative inline-flex items-center justify-center gap-2.5 select-none no-underline",
    "font-bold lowercase tracking-[0.01em] cursor-pointer",
    fullWidth ? "w-full" : "",
    disabled ? "opacity-50 pointer-events-none" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const style: React.CSSProperties = {
    height: `${heightPx}px`,
    paddingLeft: `${padX}px`,
    paddingRight: `${padX}px`,
    fontSize: `${fontSize}px`,
    borderRadius: "0px",
    backgroundColor: v.bg,
    color: v.text,
    border: v.border,
    boxShadow: `5px 5px 0 0 ${v.shadow}`,
    transition: "transform 90ms ease-out, box-shadow 90ms ease-out",
    ["--neo-shadow" as string]: v.shadow,
    ["--neo-focus" as string]: v.focusOutline,
  };

  const inner = (
    <>
      <style>{`
        .neo-btn:hover:not(:disabled) {
          transform: translate(-1px, -1px);
          box-shadow: 6px 6px 0 0 var(--neo-shadow) !important;
        }
        .neo-btn:active:not(:disabled) {
          transform: translate(5px, 5px) !important;
          box-shadow: 0 0 0 0 var(--neo-shadow) !important;
        }
        .neo-btn:focus-visible {
          outline: 2px solid var(--neo-focus) !important;
          outline-offset: 4px !important;
        }
      `}</style>
      <span>{children}</span>
      {Icon ? (
        <Icon
          size={18}
          strokeWidth={2}
          aria-hidden="true"
          className="transition-transform duration-150 group-hover:translate-x-[3px]"
        />
      ) : null}
    </>
  );

  if ((as === "link" || to) && to) {
    return (
      <Link to={to} onClick={onClick} className={baseClass} style={style} aria-label={ariaLabel}>
        {inner}
      </Link>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={baseClass}
      style={style}
      aria-label={ariaLabel}
    >
      {inner}
    </button>
  );
}
