import { Link } from "react-router";
import { LogoMark } from "../brand/Logo";
import { NeoButton } from "../ui/NeoButton";

const COLUMNS = [
  {
    header: "PRODUCT",
    links: [
      { to: "/how-it-works", label: "how it works" },
      { to: "/demo", label: "two-phone demo" },
      { to: "/sandbox", label: "live sandbox" },
    ],
  },
  {
    header: "EXPLORE",
    links: [
      { to: "/arena", label: "bargain arena" },
      { to: "/dispatch", label: "dispatch desk" },
      { to: "/traction", label: "traction" },
    ],
  },
  {
    header: "BUILD",
    links: [{ to: "/guide", label: "sdk guide" }],
  },
  {
    header: "ACCOUNT",
    links: [
      { to: "/auth", label: "sign in" },
      { to: "/onboarding", label: "onboarding" },
      { to: "/app", label: "my desk" },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="mesh-canvas w-full pt-[96px] md:pt-[160px] pb-[48px] text-fg border-t border-[var(--hairline)]">
      <div className="mx-auto max-w-[1200px] px-5 md:px-10">
        <div className="flex flex-col items-center text-center">
          <h2 className="t-mega lowercase text-fg">
            built for the
            <br />
            trustworthy.
          </h2>
          <div className="mt-10">
            <NeoButton variant="white" size="lg" to="/onboarding">
              start a deal
            </NeoButton>
          </div>
        </div>

        <div className="mt-[96px] grid grid-cols-2 gap-10 md:grid-cols-4 text-left">
          {COLUMNS.map((col) => (
            <div key={col.header} className="flex flex-col gap-4">
              <div className="eyebrow text-muted">{col.header}</div>
              <ul className="flex flex-col gap-2.5 list-none p-0 m-0">
                {col.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-[14px] font-medium lowercase text-fg-2 hover:text-fg no-underline transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-[var(--hairline)] pt-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex items-center gap-2.5 text-fg">
            <LogoMark size={20} />
            <span className="text-[14px] font-semibold lowercase">mudra · samvaddeal</span>
          </div>
          <p className="t-small lowercase text-muted">
            © 2026 team chanakya. escrow simulated in demo mode.
          </p>
        </div>
      </div>
    </footer>
  );
}
