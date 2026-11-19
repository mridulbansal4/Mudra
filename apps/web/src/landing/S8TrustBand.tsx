const TRUST_ITEMS = [
  "nexconn chat",
  "nexconn call",
  "go escrow engine",
  "rust assay verifier",
  "gemini",
  "bhashini",
] as const;

export function S8TrustBand() {
  return (
    <section
      aria-label="Built on"
      className="w-full bg-pop-black py-12 px-5 md:px-10"
      style={{
        borderTop: "1px solid var(--hairline)",
        borderBottom: "1px solid var(--hairline)",
      }}
    >
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-x-5 gap-y-3 text-center">
        <span className="eyebrow text-muted mr-2">BUILT ON</span>
        {TRUST_ITEMS.map((item, idx) => (
          <span key={item} className="inline-flex items-center gap-5">
            {idx > 0 ? (
              <span
                aria-hidden="true"
                className="inline-block size-[6px] rounded-full bg-dim"
              />
            ) : null}
            <span className="text-[16px] font-semibold lowercase text-fg-2">
              {item}
            </span>
          </span>
        ))}
      </div>
    </section>
  );
}
