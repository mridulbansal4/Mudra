import { AnimatePresence, motion } from "motion/react";
import { ease, useReducedMotion } from "../../motion/hooks";
import type { ScreenId } from "../script";
import type { DemoAction, DemoState } from "../store";
import { ArbiterDesk } from "./ArbiterDesk";
import { BuyerHome } from "./BuyerHome";
import { DealChat } from "./DealChat";
import { EscrowSheet } from "./EscrowSheet";
import { Freeze } from "./Freeze";
import { LiveInspection } from "./LiveInspection";
import { Receipt } from "./Receipt";
import { SellerHome } from "./SellerHome";
import { SellerAwaitingRelease, SellerLive } from "./SellerLive";
import { SellerPaid } from "./SellerPaid";
import { Verdict } from "./Verdict";

export interface PhoneScreenRouterProps {
  screen: ScreenId;
  state: DemoState;
  dispatch: (action: DemoAction) => void;
  autoLockEscrow?: boolean;
}

function renderScreen(
  screen: ScreenId,
  state: DemoState,
  dispatch: (action: DemoAction) => void,
  autoLockEscrow: boolean
) {
  switch (screen) {
    case "B1":
      return <BuyerHome state={state} dispatch={dispatch} />;
    case "B2":
      return <DealChat state={state} dispatch={dispatch} viewer="buyer" />;
    case "B3":
      return <EscrowSheet state={state} dispatch={dispatch} autoLock={autoLockEscrow} />;
    case "B4":
      return <LiveInspection state={state} dispatch={dispatch} />;
    case "B5":
      return <Receipt state={state} dispatch={dispatch} />;
    case "B6":
      return <Freeze state={state} dispatch={dispatch} viewer="buyer" />;
    case "B7":
      return <Verdict state={state} dispatch={dispatch} />;
    case "S1":
      return <SellerHome state={state} dispatch={dispatch} />;
    case "S2":
      return <DealChat state={state} dispatch={dispatch} viewer="seller" />;
    case "S3":
      return <SellerLive state={state} dispatch={dispatch} />;
    case "S4":
      return <SellerAwaitingRelease state={state} />;
    case "S5":
      return <SellerPaid />;
    case "S6":
      return <Freeze state={state} dispatch={dispatch} viewer="seller" />;
    case "A1":
      return <ArbiterDesk state={state} dispatch={dispatch} />;
  }
}

export function PhoneScreenRouter({
  screen,
  state,
  dispatch,
  autoLockEscrow = false,
}: PhoneScreenRouterProps) {
  const reduced = Boolean(useReducedMotion());
  const isSheet = screen === "B3" || screen === "B7";

  if (reduced) {
    return (
      <div className="min-h-full w-full">
        {renderScreen(screen, state, dispatch, autoLockEscrow)}
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={screen}
        initial={isSheet ? { y: "18%", opacity: 0 } : { x: "18%", opacity: 0.6 }}
        animate={{ x: "0%", y: "0%", opacity: 1 }}
        exit={isSheet ? { y: "12%", opacity: 0 } : { x: "-12%", opacity: 0.6 }}
        transition={
          isSheet
            ? { type: "spring", bounce: 0, duration: 0.45 }
            : { duration: 0.42, ease: ease.ios }
        }
        className="min-h-full w-full"
      >
        {renderScreen(screen, state, dispatch, autoLockEscrow)}
      </motion.div>
    </AnimatePresence>
  );
}
