import { Snowflake } from "lucide-react";
import { NeoButton } from "../../ui/NeoButton";
import { RpmMeter } from "../parts/RpmMeter";
import { SimVideo } from "../parts/SimVideo";
import type { DemoAction, DemoState } from "../store";

export interface LiveInspectionProps {
  state: DemoState;
  dispatch: (action: DemoAction) => void;
}

export function LiveInspection({ state, dispatch }: LiveInspectionProps) {
  return (
    <div className="flex h-full min-h-[760px] flex-col bg-pop-black text-fg">
      {/* Top 62% simulated HD stream */}
      <SimVideo
        perspective="buyer"
        liveSeconds={state.liveSeconds}
        frameMatch={state.frameMatch}
        rpm={state.rpm}
        className="h-[62%] min-h-[420px]"
      />

      {/* Bottom panel (VelvetCard radius 28 top, bg #121212) */}
      <div
        className="-mt-5 relative z-20 flex flex-1 flex-col justify-between gap-4 p-5"
        style={{
          borderTopLeftRadius: "28px",
          borderTopRightRadius: "28px",
          backgroundColor: "#121212",
          borderTop: "1px solid var(--hairline)",
        }}
      >
        <RpmMeter frameMatch={state.frameMatch} rpm={state.rpm} />

        {/* Actions row */}
        <div className="flex items-center gap-3 pt-1">
          <div className="flex-1">
            <NeoButton
              variant="paccha"
              size="md"
              fullWidth
              onClick={() =>
                dispatch({
                  type: "FSM_TRANSITION",
                  action: "MARK_ASSAY_VERIFIED",
                  actor: "buyer",
                })
              }
            >
              looks right — verify
            </NeoButton>
          </div>
          <button
            type="button"
            aria-label="Raise dispute and freeze deal"
            onClick={() =>
              dispatch({
                type: "FSM_TRANSITION",
                action: "RAISE_DISPUTE",
                actor: "buyer",
              })
            }
            className="flex size-[56px] shrink-0 items-center justify-center bg-transparent text-orange-sunshine cursor-pointer press"
            style={{
              borderRadius: 0,
              border: "1.5px solid #3d3d3d",
              boxShadow: "4px 4px 0 #000",
            }}
          >
            <Snowflake size={20} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
