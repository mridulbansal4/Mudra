import { Cpu, Globe, Server, ShieldCheck, type LucideIcon } from "lucide-react";
import { FadeUp } from "../motion/FadeUp";
import { useReducedMotion } from "../motion/hooks";
import { Eyebrow } from "../ui/Eyebrow";
import { NeoButton } from "../ui/NeoButton";
import { VelvetCard } from "../ui/VelvetCard";

interface ArchNode {
  label: string;
  sub: string;
  icon: LucideIcon;
}

const ARCH_NODES: ArchNode[] = [
  {
    label: "browser / phone",
    sub: "chat & calls",
    icon: Globe,
  },
  {
    label: "nexconn bridge (node)",
    sub: "ai + nexconn sdk",
    icon: Server,
  },
  {
    label: "deal engine (go)",
    sub: "escrow state machine",
    icon: Cpu,
  },
  {
    label: "assay verifier (rust)",
    sub: "pii, hashes, signatures",
    icon: ShieldCheck,
  },
];

export function ArchitectureStrip() {
  const reduced = Boolean(useReducedMotion());

  return (
    <section className="w-full bg-pop-black py-[96px] md:py-[160px] px-5 md:px-10">
      <div className="mx-auto max-w-[1200px]">
        <FadeUp>
          <Eyebrow dot>SYSTEM ARCHITECTURE</Eyebrow>
          <h2 className="t-h1 mt-4 lowercase text-fg">
            one pipeline, four fast hops.
          </h2>

          {/* Single wide VelvetCard with left-to-right flow */}
          <VelvetCard className="mt-10 p-6 md:p-10">
            {!reduced ? (
              <style>{`
                @keyframes arch-dot-move {
                  0% { transform: translateX(0px); opacity: 0; }
                  15% { opacity: 1; }
                  85% { opacity: 1; }
                  100% { transform: translateX(64px); opacity: 0; }
                }
              `}</style>
            ) : null}

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {ARCH_NODES.map((node, idx) => {
                const Icon = node.icon;
                return (
                  <div
                    key={node.label}
                    className="flex flex-1 flex-col lg:flex-row lg:items-center gap-4"
                  >
                    <div className="flex flex-1 flex-col items-start">
                      <div
                        className="flex w-full items-center gap-3 px-4 py-3.5"
                        style={{
                          borderRadius: "12px",
                          backgroundColor: "var(--card-2)",
                          border: "1px solid var(--hairline)",
                        }}
                      >
                        <Icon
                          size={20}
                          strokeWidth={1.5}
                          className="shrink-0 text-neo-paccha"
                          aria-hidden="true"
                        />
                        <span className="text-[14px] font-bold lowercase text-fg">
                          {node.label}
                        </span>
                      </div>
                      <span className="t-small mt-2 pl-1 lowercase text-muted">
                        {node.sub}
                      </span>
                    </div>

                    {idx < ARCH_NODES.length - 1 ? (
                      <div
                        aria-hidden="true"
                        className="hidden lg:flex relative h-[10px] w-[72px] shrink-0 items-center overflow-hidden"
                      >
                        <span
                          className="h-[1px] w-full"
                          style={{ backgroundColor: "var(--hairline)" }}
                        />
                        <span
                          className="absolute left-0 size-[6px] bg-neo-paccha"
                          style={{
                            borderRadius: 0,
                            animation: reduced
                              ? "none"
                              : `arch-dot-move 1.8s linear ${idx * 0.45}s infinite`,
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </VelvetCard>
        </FadeUp>

        {/* 5. CTA band */}
        <FadeUp className="mt-[96px] md:mt-[120px] flex flex-col items-center text-center">
          <h2 className="t-h1 lowercase text-fg">seen enough?</h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-5">
            <NeoButton variant="purple" size="lg" to="/demo">
              watch both phones
            </NeoButton>
            <NeoButton variant="ghost" size="lg" to="/sandbox">
              run the live sandbox
            </NeoButton>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
