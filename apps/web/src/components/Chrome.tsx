import { useEffect, type ReactNode } from "react";
import { Link } from "react-router";
import { Logo } from "../brand/Logo";
import { SiteNav } from "../site/SiteNav";
import { VelvetCard } from "../ui/VelvetCard";

export function Wordmark() {
  return (
    <Link to="/" className="inline-flex items-center gap-2 text-fg no-underline" aria-label="mudra home">
      <Logo layout="row" markSize={22} wordmarkSize={12} />
    </Link>
  );
}

export function TopNav(_props: { wide?: boolean }) {
  return <SiteNav />;
}

export function Page({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-dvh bg-pop-black text-fg">
      <TopNav wide={wide} />
      <main className={`mx-auto px-5 pt-24 pb-12 md:px-10 ${wide ? "max-w-[1600px]" : "max-w-[1440px]"}`}>
        {children}
      </main>
    </div>
  );
}

export function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  useEffect(() => {
    document.title = "Mudra";
  }, []);

  return (
    <div className="mb-8">
      <h1
        className="text-fg font-bold tracking-[-0.015em] leading-[1.08]"
        style={{
          fontFamily: "var(--font-display)",
          fontVariationSettings: '"opsz" 144, "SOFT" 0, "WONK" 0',
          fontSize: "clamp(32px, 3.4vw, 48px)",
        }}
      >
        {title}
      </h1>
      {sub ? <p className="mt-2 max-w-[68ch] text-[15px] text-fg-2">{sub}</p> : null}
    </div>
  );
}

export function Banner({ tone = "info", children }: { tone?: "info" | "danger" | "ok"; children: ReactNode }) {
  const cls =
    tone === "danger"
      ? "bg-freeze-bg text-freeze border-freeze/30"
      : tone === "ok"
        ? "bg-vault-bg text-vault border-vault/30"
        : "bg-card-3 text-fg-2 border-[var(--hairline)]";
  return (
    <div
      className={`rounded-[16px] border px-4 py-2.5 text-[14px] ${cls}`}
      role={tone === "danger" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <VelvetCard>
      <div className="text-[13px] text-muted">{label}</div>
      <div className="t-num-xl num mt-2 !text-[32px] text-fg">{value}</div>
      {hint ? <div className="mt-1 text-[12.5px] text-muted">{hint}</div> : null}
    </VelvetCard>
  );
}
