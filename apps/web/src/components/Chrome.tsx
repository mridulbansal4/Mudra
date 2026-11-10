import { Link, NavLink, useNavigate } from "react-router";
import { Button } from "@heroui/react";
import type { ReactNode } from "react";
import { setSession, useSession } from "../lib/session";

const LINKS = [
  { to: "/sandbox", label: "Split-screen demo" },
  { to: "/arena", label: "Bargain arena" },
  { to: "/dispatch", label: "Dispatch" },
  { to: "/guide", label: "SDK guide" },
  { to: "/traction", label: "Traction" },
];

export function Wordmark() {
  return (
    <Link to="/" className="flex items-center gap-2 text-ink no-underline" aria-label="SAMADHAN-OS home">
      <img src="/seal.svg" alt="" width={22} height={22} />
      <span className="text-[15px] font-semibold">SAMADHAN-OS</span>
      <span className="hidden text-[13px] text-ink-3 sm:inline">SamvadDeal</span>
    </Link>
  );
}

export function TopNav({ wide = false }: { wide?: boolean }) {
  const session = useSession();
  const nav = useNavigate();
  return (
    <header className="glass sticky top-0 z-30 border-b hairline">
      <div className={`mx-auto flex h-14 items-center gap-6 px-4 sm:px-6 ${wide ? "max-w-[1600px]" : "max-w-[1440px]"}`}>
        <Wordmark />
        <nav className="hidden flex-1 items-center gap-1 md:flex" aria-label="Primary">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `rounded-md px-3 py-1.5 text-[14px] no-underline transition-colors ${isActive ? "bg-well text-ink" : "text-ink-2 hover:text-ink"}`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {session ? (
            <>
              <Link to="/app" className="text-[14px] text-ink-2 no-underline hover:text-ink">
                {session.displayName}
              </Link>
              <button
                className="press text-[13px] text-ink-3 hover:text-ink"
                onClick={() => {
                  setSession(null);
                  nav("/");
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/auth" className="text-[14px] text-ink-2 no-underline hover:text-ink">
                Sign in
              </Link>
              <Button size="sm" variant="primary" onPress={() => nav("/sandbox")}>
                Launch 1-click demo
              </Button>
            </>
          )}
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden" aria-label="Primary mobile">
        {LINKS.map((l) => (
          <NavLink key={l.to} to={l.to} className="whitespace-nowrap rounded-md px-2.5 py-1 text-[13px] text-ink-2 no-underline">
            {l.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}

export function Page({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-dvh bg-canvas">
      <TopNav wide={wide} />
      <main className={`mx-auto px-4 py-8 sm:px-6 ${wide ? "max-w-[1600px]" : "max-w-[1440px]"}`}>{children}</main>
    </div>
  );
}

export function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-[28px] font-medium leading-[1.18] tracking-[-0.015em] text-ink">{title}</h1>
      {sub ? <p className="mt-1.5 max-w-[68ch] text-[15px] text-ink-2">{sub}</p> : null}
    </div>
  );
}

export function Banner({ tone = "info", children }: { tone?: "info" | "danger" | "ok"; children: ReactNode }) {
  const cls =
    tone === "danger" ? "bg-freeze-bg text-freeze border-freeze/30" : tone === "ok" ? "bg-vault-bg text-vault border-vault/30" : "bg-well text-ink-2 hairline";
  return <div className={`rounded-lg border px-4 py-2.5 text-[14px] ${cls}`} role={tone === "danger" ? "alert" : "status"}>{children}</div>;
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border hairline bg-paper p-5">
      <div className="text-[13px] text-ink-3">{label}</div>
      <div className="num mt-2 text-[26px] font-medium text-ink">{value}</div>
      {hint ? <div className="mt-1 text-[12.5px] text-ink-3">{hint}</div> : null}
    </div>
  );
}
