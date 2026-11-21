import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "react-router";
import { ExternalLink, RotateCcw } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { ControlDock } from "../demo/parts/ControlDock";
import { SyncSpine } from "../demo/parts/SyncSpine";
import { TOTAL_SCRIPT_STEPS, type DemoBranch } from "../demo/script";
import { ArbiterDesk } from "../demo/screens/ArbiterDesk";
import { PhoneScreenRouter } from "../demo/screens/PhoneScreenRouter";
import { createDemoStore } from "../demo/store";
import { useReducedMotion } from "../motion/hooks";
import { SiteNav } from "../site/SiteNav";
import { Eyebrow } from "../ui/Eyebrow";
import { NeoButton } from "../ui/NeoButton";
import { PhoneFrame } from "../ui/PhoneFrame";
import { SegmentedControl } from "../ui/SegmentedControl";

const BRANCH_OPTIONS = [
  { value: "happy" as const, label: "happy path" },
  { value: "dispute" as const, label: "dispute" },
] as const;

export default function Demo() {
  const [searchParams, setSearchParams] = useSearchParams();
  const reducedMotion = Boolean(useReducedMotion());

  const initialBranch: DemoBranch =
    searchParams.get("branch") === "dispute" ? "dispute" : "happy";
  const initialStepParam = Number(searchParams.get("step"));
  const hasInitialStep =
    !Number.isNaN(initialStepParam) &&
    initialStepParam >= 0 &&
    initialStepParam <= TOTAL_SCRIPT_STEPS &&
    searchParams.has("step");

  const store = useMemo(() => {
    const s = createDemoStore(initialBranch, !hasInitialStep);
    if (hasInitialStep) {
      s.dispatch(
        { type: "JUMP_TO_STEP", step: initialStepParam, branch: initialBranch },
        false
      );
    }
    return s;
  }, []);

  useEffect(() => {
    document.title = "Mudra";
    return () => store.destroy();
  }, [store]);

  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);

  // Sync URL with branch and step
  useEffect(() => {
    const nextParams = new URLSearchParams();
    nextParams.set("branch", state.branch);
    nextParams.set("step", String(state.step));
    setSearchParams(nextParams, { replace: true });
  }, [state.branch, state.step, setSearchParams]);

  // Autoplay step timer (2.2s default, scaled by speed)
  useEffect(() => {
    if (!state.playing) return;
    const intervalMs = Math.round(2200 / state.speed);
    const id = window.setInterval(() => {
      store.dispatch({ type: "NEXT_STEP" });
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [state.playing, state.speed, store]);

  // Freeze countdown timer (6x speed: 1 tick per ~166ms)
  useEffect(() => {
    if (state.fsm !== "DISPUTED_FROZEN" || !state.playing) return;
    const id = window.setInterval(() => {
      store.dispatch({ type: "TICK_FREEZE" });
    }, Math.round(166 / state.speed));
    return () => window.clearInterval(id);
  }, [state.fsm, state.playing, state.speed, store]);

  // Live inspection elapsed seconds timer
  useEffect(() => {
    if (state.fsm !== "INSPECTION_LIVE") return;
    const id = window.setInterval(() => {
      store.dispatch({ type: "TICK_LIVE" }, false);
    }, 1000);
    return () => window.clearInterval(id);
  }, [state.fsm, store]);

  // Keyboard shortcuts: Space = play/pause, -> = next, <- = prev
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        store.dispatch({ type: "SET_PLAYING", playing: !store.getState().playing });
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        store.dispatch({ type: "SET_PLAYING", playing: false });
        store.dispatch({ type: "NEXT_STEP" });
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        store.dispatch({ type: "PREV_STEP" });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [store]);

  // Responsive phone scale
  const [phoneScale, setPhoneScale] = useState(0.76);
  useEffect(() => {
    const updateScale = () => {
      const s = Math.min(1, Math.max(0.62, (window.innerHeight - 220) / 868));
      setPhoneScale(Number(s.toFixed(2)));
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  const handlePopOut = () => {
    window.open("/demo/phone/buyer", "mudra-buyer", "width=460,height=920");
    window.open("/demo/phone/seller", "mudra-seller", "width=460,height=920");
    window.setTimeout(() => {
      store.dispatch({ type: "SYNC_STATE", state: store.getState() }, true);
    }, 350);
    window.setTimeout(() => {
      store.dispatch({ type: "SYNC_STATE", state: store.getState() }, true);
    }, 800);
  };

  const [arbiterDismissed, setArbiterDismissed] = useState(false);
  useEffect(() => {
    if (state.branch === "dispute" && state.step === 8) {
      setArbiterDismissed(false);
      const id = window.setTimeout(() => setArbiterDismissed(true), 3000);
      return () => window.clearTimeout(id);
    }
    setArbiterDismissed(false);
  }, [state.branch, state.step]);

  const showArbiterOverlay =
    state.branch === "dispute" &&
    (state.step === 7 || (state.step === 8 && !arbiterDismissed));

  return (
    <div className="mesh-canvas min-h-dvh w-full text-fg pb-28">
      <SiteNav />

      {/* Header row (max-width 1400px, padding top 104px) */}
      <div className="mx-auto max-w-[1400px] px-5 pt-[104px] md:px-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Eyebrow dot>TWO-PHONE DEMO</Eyebrow>
            <h1 className="t-h1 mt-3 lowercase text-fg">one deal, seen from both sides.</h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <SegmentedControl
              options={BRANCH_OPTIONS}
              value={state.branch}
              onChange={(branch) => store.dispatch({ type: "SET_BRANCH", branch })}
              ariaLabel="Demo branch"
            />
            <NeoButton
              variant="white"
              size="md"
              icon={RotateCcw}
              onClick={() => store.dispatch({ type: "REPLAY" })}
            >
              replay
            </NeoButton>
            <div className="flex flex-col items-start">
              <NeoButton
                variant="ghost"
                size="md"
                icon={ExternalLink}
                onClick={handlePopOut}
              >
                pop out phones
              </NeoButton>
              <span className="mt-1 text-[11px] lowercase text-muted">same browser only</span>
            </div>
          </div>
        </div>

        {/* Stage */}
        <div className="relative mt-10 flex flex-col items-center justify-center gap-8 min-[1100px]:flex-row min-[1100px]:items-start min-[1100px]:gap-0">
          <PhoneFrame
            scale={phoneScale}
            label={
              <>
                rajesh · buyer · <span lang="ta">தமிழ்</span>
              </>
            }
          >
            <PhoneScreenRouter
              screen={state.buyerScreen}
              state={state}
              dispatch={store.dispatch}
              autoLockEscrow={state.playing}
            />
          </PhoneFrame>

          <div className="my-auto">
            <SyncSpine state={state} />
          </div>

          <PhoneFrame
            scale={phoneScale}
            label={
              <>
                vikram · seller · <span lang="hi">हिन्दी</span>
              </>
            }
          >
            <PhoneScreenRouter
              screen={state.sellerScreen}
              state={state}
              dispatch={store.dispatch}
            />
          </PhoneFrame>

          {/* Optional third smaller phone for Meera on dispute branch */}
          <AnimatePresence>
            {showArbiterOverlay ? (
              <motion.div
                initial={reducedMotion ? { opacity: 1 } : { y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 80, opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="min-[1100px]:absolute min-[1100px]:bottom-0 min-[1100px]:left-1/2 min-[1100px]:-translate-x-1/2 z-20"
              >
                <PhoneFrame scale={0.55} label="meera · arbitrator · english">
                  <ArbiterDesk state={state} dispatch={store.dispatch} />
                </PhoneFrame>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <ControlDock state={state} dispatch={store.dispatch} />
    </div>
  );
}
