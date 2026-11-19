export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (next: T) => void;
  ariaLabel?: string;
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel = "View selector",
  className = "",
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`inline-flex items-center p-1 gap-1 ${className}`}
      style={{
        borderRadius: "999px",
        backgroundColor: "var(--card-3)",
        border: "1px solid var(--hairline)",
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className="px-3.5 py-1.5 text-[12.5px] font-semibold lowercase cursor-pointer transition-all duration-200 border-0"
            style={{
              borderRadius: "999px",
              backgroundColor: active ? "#ffffff" : "transparent",
              color: active ? "#0d0d0d" : "var(--fg-2)",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
