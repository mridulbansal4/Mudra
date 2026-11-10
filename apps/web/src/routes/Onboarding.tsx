import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { Button } from "@heroui/react";
import type { Locale, Role } from "@samadhan/shared-types";
import { LOCALE_LABEL } from "@samadhan/shared-types";
import { Wordmark } from "../components/Chrome";
import { StoryBar } from "../components/StoryBar";
import { updateSession, useSession } from "../lib/session";
import { DEMO_RPM, captureFrame, drawSimulatedFrame, laplacianVariance } from "../lib/assay";

const STEPS = ["Language and role", "Video assay source", "Deal preview"];

export default function Onboarding() {
  const s = useSession();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [locale, setLocale] = useState<Locale>(s?.locale ?? "en-IN");
  const [role, setRole] = useState<Role>(s?.role ?? "buyer");
  const [sim, setSim] = useState(s?.simulatedCamera ?? true);
  const [consent, setConsent] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sharp, setSharp] = useState<number | null>(null);
  const [previewState, setPreviewState] = useState(0);

  useEffect(() => {
    if (step !== 1) return;
    let raf = 0;
    const ctx = canvasRef.current?.getContext("2d");
    const loop = (t: number) => {
      if (ctx) drawSimulatedFrame(ctx, 640, 480, t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const id = window.setInterval(() => {
      if (canvasRef.current) {
        const f = captureFrame(canvasRef.current, 160, 120);
        setSharp(laplacianVariance(f.rgba, f.width, f.height));
      }
    }, 800);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(id);
    };
  }, [step]);

  useEffect(() => {
    if (step !== 2) return;
    const id = window.setInterval(() => setPreviewState((p) => (p + 1) % 4), 1800);
    return () => window.clearInterval(id);
  }, [step]);

  if (!s) return <Navigate to="/auth" replace />;

  const finish = () => {
    updateSession({ locale, role, simulatedCamera: sim, onboarded: true });
    nav("/app");
  };
  const previewStates = ["CREATED", "FUNDED", "INSPECTION_LIVE", "RELEASED"] as const;

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="mx-auto flex h-14 max-w-[1100px] items-center justify-between px-4 sm:px-6">
        <Wordmark />
        <span className="text-[13.5px] text-ink-2">
          Step {step + 1} of 3: {STEPS[step]}
        </span>
        <button className="press text-[13.5px] text-ink-3 hover:text-ink" onClick={finish}>
          Skip
        </button>
      </header>
      <main className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6">
        <ol className="mb-6 flex flex-wrap gap-2 text-[13px]" aria-label="Onboarding progress">
          {STEPS.map((t, i) => (
            <li key={t} className={`rounded-[11px] px-3 py-1 ${i === step ? "bg-seal text-seal-ink" : i < step ? "bg-vault-bg text-vault" : "bg-well text-ink-3"}`}>
              {i + 1}. {t}
            </li>
          ))}
        </ol>

        <section className="rounded-[20px] border hairline bg-paper p-6">
          {step === 0 ? (
            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <h1 className="text-[22px] font-medium text-ink">Your native language</h1>
                <p className="mt-1 text-[14px] text-ink-2">Messages you receive are translated into this language inline.</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {(Object.keys(LOCALE_LABEL) as Locale[]).map((l) => (
                    <button
                      key={l}
                      onClick={() => setLocale(l)}
                      className={`press rounded-lg border px-3 py-3 text-left ${locale === l ? "border-seal bg-well" : "hairline bg-paper"}`}
                      lang={l}
                    >
                      <div className="text-[17px] text-ink">{LOCALE_LABEL[l]}</div>
                      <div className="num text-[12px] text-ink-3">{l}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="text-[22px] font-medium text-ink">Your role in this deal</h2>
                <div className="mt-4 space-y-2">
                  {(["buyer", "seller", "arbitrator"] as Role[]).map((r) => (
                    <label key={r} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 ${role === r ? "border-seal bg-well" : "hairline"}`}>
                      <input type="radio" checked={role === r} onChange={() => setRole(r)} className="accent-[var(--accent)]" />
                      <span className="text-[15px] capitalize text-ink">{r}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="overflow-hidden rounded-xl bg-black">
                <canvas ref={canvasRef} width={640} height={480} className="block aspect-[4/3] w-full" />
                <div className="num flex justify-between px-3 py-2 text-[12px] text-white/80">
                  <span>Sharpness {sharp?.toFixed(0) ?? "—"} {sharp != null && sharp >= 100 ? "(pass)" : ""}</span>
                  <span>Audio FFT target {DEMO_RPM.toLocaleString("en-IN")} RPM</span>
                </div>
              </div>
              <div>
                <h1 className="text-[22px] font-medium text-ink">Live inspection camera</h1>
                <div className="mt-4 space-y-2">
                  <label className={`flex cursor-pointer gap-3 rounded-lg border px-3 py-3 ${!sim ? "border-seal bg-well" : "hairline"}`}>
                    <input type="radio" checked={!sim} onChange={() => setSim(false)} className="accent-[var(--accent)]" />
                    <span className="text-[15px] text-ink">Use my webcam and microphone</span>
                  </label>
                  <label className={`flex cursor-pointer gap-3 rounded-lg border px-3 py-3 ${sim ? "border-seal bg-well" : "hairline"}`}>
                    <input type="radio" checked={sim} onChange={() => setSim(true)} className="accent-[var(--accent)]" />
                    <span>
                      <span className="block text-[15px] text-ink">Use the simulated HD inspection stream</span>
                      <span className="block text-[13px] text-ink-3">Recommended on desktops without the product in front of the camera</span>
                    </span>
                  </label>
                </div>
                <label className="mt-5 flex gap-3 text-[14px] text-ink-2">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="accent-[var(--accent)]" />
                  Log a signed DPDP consent receipt in my System channel
                </label>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div>
              <h1 className="mb-4 text-[22px] font-medium text-ink">The four stages you will see on every deal</h1>
              <div className="overflow-hidden rounded-xl border hairline">
                <StoryBar state={previewStates[previewState]} />
              </div>
              <p className="mt-4 text-[14px] text-ink-2">The bar above cycles through a deal. On the desk it tracks your real escrow state and always names one next step.</p>
            </div>
          ) : null}

          <div className="mt-8 flex justify-between">
            <Button variant="ghost" isDisabled={step === 0} onPress={() => setStep(step - 1)}>
              Back
            </Button>
            {step < 2 ? (
              <Button variant="primary" onPress={() => setStep(step + 1)}>
                Next: {STEPS[step + 1].toLowerCase()}
              </Button>
            ) : (
              <Button variant="primary" onPress={finish}>
                Open the deal desk
              </Button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
