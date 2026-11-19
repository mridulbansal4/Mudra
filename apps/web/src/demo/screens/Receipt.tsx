import { BadgeCheck } from "lucide-react";
import { motion } from "motion/react";
import { useReducedMotion } from "../../motion/hooks";
import { ListGroup, ListRow } from "../../ui/ListRow";
import { NeoButton } from "../../ui/NeoButton";
import { DEAL_META } from "../script";
import type { DemoAction, DemoState } from "../store";

export interface ReceiptProps {
  state: DemoState;
  dispatch: (action: DemoAction) => void;
}

const BURST_ANGLES = Array.from({ length: 12 }, (_, i) => i * 30);

export function Receipt({ state, dispatch }: ReceiptProps) {
  const reduced = Boolean(useReducedMotion());
  const released = state.fsm === "RELEASED";

  return (
    <div className="flex min-h-full flex-col justify-between bg-pop-black p-4 text-fg">
      <div
        className="relative overflow-hidden p-5 pt-7"
        style={{
          borderRadius: "28px",
          backgroundColor: "#121212",
          border: "1px solid var(--hairline)",
        }}
      >
        {/* Perforated top edge look: row of 10px half-circles */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-3 right-3 h-[10px]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 5px 0px, #0d0d0d 5px, transparent 5.5px)",
            backgroundSize: "16px 10px",
            backgroundRepeat: "repeat-x",
          }}
        />

        <div className="flex flex-col items-center text-center">
          <BadgeCheck size={40} strokeWidth={1.5} className="text-neo-paccha" aria-hidden="true" />
          <div className="mt-2 text-[20px] font-extrabold lowercase text-fg">assay verified</div>
          <div className="mt-1 text-[12.5px] font-medium lowercase text-muted">
            {DEAL_META.item.toLowerCase()}
          </div>
          <div className="num mt-3 text-[36px] font-extrabold leading-none text-fg">
            {DEAL_META.amountFormatted}
          </div>
        </div>

        <ListGroup className="mt-5">
          <ListRow label="frame match" value="96%" showChevron={false} />
          <ListRow label="motor" value="4,820 rpm" showChevron={false} />
          <ListRow
            label="signed by"
            value={<span className="text-[13px] font-semibold lowercase">samadhan verifier</span>}
            showChevron={false}
          />
        </ListGroup>

        <div className="mt-4 flex items-center justify-between border-t border-[var(--hairline)] pt-3">
          <span className="font-mono text-[11px] text-fg-2 num">{DEAL_META.signatureHash}</span>
          <span className="t-small num lowercase text-muted">19 nov 2026 · 09:41 ist</span>
        </div>

        {/* RELEASED stamp + 12 radial burst lines */}
        {released ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            {!reduced
              ? BURST_ANGLES.map((deg) => (
                  <span
                    key={deg}
                    aria-hidden="true"
                    className="absolute h-[1.5px] w-[36px] bg-neo-paccha"
                    style={{
                      transform: `rotate(${deg}deg) translateX(64px)`,
                      animation: "stamp-burst 500ms ease-out both",
                    }}
                  />
                ))
              : null}
            <style>{`
              @keyframes stamp-burst {
                0% { opacity: 0; transform-origin: left center; scale: 0 1; }
                45% { opacity: 1; scale: 1 1; }
                100% { opacity: 0; scale: 0 1; }
              }
            `}</style>
            <motion.div
              initial={reduced ? false : { scale: 1.4, opacity: 0, rotate: -8 }}
              animate={{ scale: 1, opacity: 1, rotate: -8 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="px-5 py-2 text-[22px] font-extrabold uppercase tracking-[0.18em] text-neo-paccha bg-pop-black/90"
              style={{
                borderRadius: 0,
                border: "2px solid var(--neo-paccha)",
              }}
            >
              RELEASED
            </motion.div>
          </div>
        ) : null}
      </div>

      <div className="mt-5 pb-2">
        {!released ? (
          <NeoButton
            variant="purple"
            size="md"
            fullWidth
            onClick={() =>
              dispatch({ type: "FSM_TRANSITION", action: "RELEASE_FUNDS", actor: "buyer" })
            }
          >
            <span className="num">release ₹1,45,000 to vikram</span>
          </NeoButton>
        ) : (
          <div className="text-center text-[13px] font-semibold lowercase text-neo-paccha">
            funds released · deal complete
          </div>
        )}
      </div>
    </div>
  );
}
