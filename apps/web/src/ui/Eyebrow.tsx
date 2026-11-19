import type { ReactNode } from "react";

export interface EyebrowProps {
  dot?: boolean;
  children: ReactNode;
  className?: string;
}

export function Eyebrow({ dot = false, children, className = "" }: EyebrowProps) {
  return (
    <p className={`eyebrow inline-flex items-center gap-2 ${className}`}>
      {dot ? (
        <span
          aria-hidden="true"
          className="inline-block size-[6px] shrink-0 bg-neo-paccha"
          style={{ borderRadius: 0 }}
        />
      ) : null}
      <span>{children}</span>
    </p>
  );
}
