import { Fan, MessagesSquare, Scale, ScanLine } from "lucide-react";
import { Eyebrow } from "../../ui/Eyebrow";
import { ListGroup, ListRow } from "../../ui/ListRow";
import { NeoButton } from "../../ui/NeoButton";
import { CountdownRing } from "../parts/CountdownRing";
import { DEAL_META } from "../script";
import type { DemoAction, DemoState } from "../store";

export interface ArbiterDeskProps {
  state: DemoState;
  dispatch: (action: DemoAction) => void;
}

export function ArbiterDesk({ state, dispatch }: ArbiterDeskProps) {
  return (
    <div className="flex min-h-full flex-col justify-between bg-pop-black p-4 text-fg">
      {/* Header with 120px countdown ring top-right */}
      <div className="flex items-start justify-between gap-3">
        <div className="pt-2">
          <Eyebrow dot>ARBITRATOR DESK</Eyebrow>
          <div className="mt-2 text-[20px] font-extrabold lowercase text-fg leading-tight">
            meera krishnan
          </div>
          <div className="mt-1 font-mono text-[11px] text-muted num">
            deal · {DEAL_META.id} · {DEAL_META.amountFormatted}
          </div>
        </div>
        <CountdownRing seconds={state.freezeLeft} size={120} showLabel={false} />
      </div>

      {/* Evidence list */}
      <div className="my-4">
        <Eyebrow className="mb-2.5">EVIDENCE PACKET</Eyebrow>
        <ListGroup>
          <ListRow
            icon={ScanLine}
            label="frame phash match"
            value="96%"
            showChevron={false}
          />
          <ListRow
            icon={Fan}
            label="acoustic fft peak"
            value="4,820 rpm"
            showChevron={false}
          />
          <ListRow
            icon={MessagesSquare}
            label="bilingual transcript"
            value="ta · hi"
            showChevron={false}
          />
          <ListRow
            icon={Scale}
            label="recommended split"
            value="70 / 30"
            showChevron={false}
          />
        </ListGroup>
      </div>

      {/* Two big NeoButton options */}
      <div className="flex flex-col gap-3 pb-2">
        <NeoButton
          variant="white"
          size="md"
          fullWidth
          onClick={() =>
            dispatch({
              type: "FSM_TRANSITION",
              action: "RESOLVE_SPLIT",
              actor: "arbitrator",
            })
          }
        >
          <span className="num">split 70 / 30</span>
        </NeoButton>
        <NeoButton
          variant="ghost"
          size="md"
          fullWidth
          onClick={() =>
            dispatch({
              type: "FSM_TRANSITION",
              action: "REFUND_BUYER",
              actor: "arbitrator",
            })
          }
        >
          refund buyer
        </NeoButton>
      </div>
    </div>
  );
}
