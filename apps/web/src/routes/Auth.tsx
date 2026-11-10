import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button, Tabs } from "@heroui/react";
import type { Locale, Role } from "@samadhan/shared-types";
import { LOCALE_LABEL } from "@samadhan/shared-types";
import { Wordmark } from "../components/Chrome";
import { PERSONAS, signIn, type Persona } from "../lib/personas";
import { errorText } from "../lib/api";

const ROLES: Role[] = ["buyer", "seller", "arbitrator"];

export default function Auth() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [locale, setLocale] = useState<Locale>("ta-IN");
  const [role, setRole] = useState<Role>("buyer");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const go = async (p: { preset?: string; displayName: string; role: Role; locale: Locale }) => {
    setBusy(p.preset ?? "form");
    setError(null);
    try {
      const s = await signIn(p);
      nav(s.role === "arbitrator" ? "/dispatch" : "/onboarding");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  const form = (cta: string) => (
    <form
      className="mt-5 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return setError("Enter your name or business name");
        void go({ displayName: name.trim(), role, locale });
      }}
    >
      <label className="block">
        <span className="text-[13.5px] text-ink-2">Name or business</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tirupur Knit Works"
          className="mt-1 w-full rounded-lg border hairline bg-paper px-3 py-2 text-[15px] text-ink outline-none focus:border-seal"
        />
      </label>
      <label className="block">
        <span className="text-[13.5px] text-ink-2">Preferred language</span>
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value as Locale)}
          className="mt-1 w-full rounded-lg border hairline bg-paper px-3 py-2 text-[15px] text-ink"
        >
          {(Object.keys(LOCALE_LABEL) as Locale[]).map((l) => (
            <option key={l} value={l}>
              {LOCALE_LABEL[l]} ({l})
            </option>
          ))}
        </select>
      </label>
      <fieldset>
        <legend className="text-[13.5px] text-ink-2">Role</legend>
        <div className="mt-1 flex gap-4">
          {ROLES.map((r) => (
            <label key={r} className="flex items-center gap-1.5 text-[14.5px] capitalize text-ink">
              <input type="radio" name="role" checked={role === r} onChange={() => setRole(r)} className="accent-[var(--accent)]" />
              {r}
            </label>
          ))}
        </div>
      </fieldset>
      <Button type="submit" variant="primary" fullWidth isDisabled={busy !== null}>
        {busy === "form" ? "Issuing Nexconn access token" : cta}
      </Button>
      <p className="text-[12.5px] text-ink-3">A DPDP consent receipt is written to your Nexconn System channel when you lock your first escrow.</p>
    </form>
  );

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-4 sm:px-6">
        <Link to="/" className="text-[14px] text-ink-2 no-underline">
          Back to story
        </Link>
        <Wordmark />
        <Link to="/guide" className="text-[14px] text-ink-2 no-underline">
          Need help
        </Link>
      </header>
      <main className="mx-auto grid max-w-[1200px] grid-cols-1 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-2">
        <section className="rounded-[20px] border hairline bg-paper p-6">
          <h1 className="text-[22px] font-medium text-ink">Sign in or create account</h1>
          <Tabs className="mt-4">
            <Tabs.ListContainer>
              <Tabs.List aria-label="Account">
                <Tabs.Tab id="signin">
                  Sign in
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="signup">
                  Create account
                  <Tabs.Indicator />
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>
            <Tabs.Panel id="signin">{form("Continue to deal desk")}</Tabs.Panel>
            <Tabs.Panel id="signup">{form("Create account and continue")}</Tabs.Panel>
          </Tabs>
          {error ? (
            <p className="mt-3 text-[13.5px] text-freeze" role="alert">
              {error}
            </p>
          ) : null}
        </section>

        <section className="rounded-[20px] border hairline bg-well p-6">
          <h2 className="text-[22px] font-medium text-ink">One-tap demo personas</h2>
          <p className="mt-1 text-[14px] text-ink-2">No typing. Each tap issues a Nexconn access token through API-01.</p>
          <div className="mt-5 space-y-3">
            {PERSONAS.map((p: Persona) => (
              <button
                key={p.preset}
                disabled={busy !== null}
                onClick={() => void go({ preset: p.preset, displayName: p.name, role: p.role, locale: p.locale })}
                className="press block w-full rounded-xl border hairline bg-paper px-4 py-3 text-left hover:border-seal disabled:opacity-60"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[15.5px] font-medium text-ink">{p.name}</span>
                  <span className="text-[12.5px] text-ink-3">
                    {p.role} · {p.locale}
                  </span>
                </div>
                <div className="mt-0.5 text-[13.5px] text-ink-2">{busy === p.preset ? "Issuing token" : p.blurb}</div>
              </button>
            ))}
          </div>
          <Button className="mt-5" variant="outline" fullWidth onPress={() => nav("/sandbox")}>
            Or launch the split-screen sandbox
          </Button>
        </section>
      </main>
    </div>
  );
}
