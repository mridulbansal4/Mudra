import type { CSSProperties, ReactNode } from "react";

export interface VelvetCardProps {
  variant?: "default" | "raised" | "glass";
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
}

export function VelvetCard({
  variant = "default",
  children,
  className = "",
  style,
  onClick,
}: VelvetCardProps) {
  const bgStyle: CSSProperties =
    variant === "raised"
      ? { backgroundColor: "var(--card-2)" }
      : variant === "glass"
        ? {
            backgroundColor: "rgba(18, 18, 18, 0.6)",
            backdropFilter: "blur(20px) saturate(140%)",
          }
        : { backgroundColor: "var(--card)" };

  const sharedStyle: CSSProperties = {
    borderRadius: "24px",
    border: "1px solid var(--hairline)",
    padding: "20px",
    ...bgStyle,
    ...style,
  };

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`w-full text-left cursor-pointer press ${className}`}
        style={sharedStyle}
      >
        {children}
      </button>
    );
  }

  return (
    <div className={className} style={sharedStyle}>
      {children}
    </div>
  );
}
