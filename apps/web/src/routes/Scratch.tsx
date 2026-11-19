import { PhoneBack } from "../hero/PhoneBack";
import { Eyebrow } from "../ui/Eyebrow";
import { NeoButton } from "../ui/NeoButton";
import { PhoneFrame } from "../ui/PhoneFrame";
import { StatusPill } from "../ui/StatusPill";
import { VelvetCard } from "../ui/VelvetCard";

export default function Scratch() {
  return (
    <div className="min-h-dvh bg-pop-black p-8 text-fg flex flex-col gap-6">
      <Eyebrow dot>SCRATCH PREVIEW · T5 PHONEFRAME (0.6 / 0.8 / 1.0) + PHONEBACK</Eyebrow>
      <div className="flex items-start gap-8">
        <PhoneFrame scale={0.6} label="rajesh · buyer · தமிழ்">
          <div className="p-5 flex flex-col gap-4">
            <StatusPill tone="locked">IN ESCROW</StatusPill>
            <VelvetCard>
              <div className="num text-[28px] font-extrabold text-fg">₹1,45,000</div>
              <div className="text-[12px] text-muted">scale 0.6</div>
            </VelvetCard>
            <NeoButton variant="purple" fullWidth>
              lock in escrow
            </NeoButton>
          </div>
        </PhoneFrame>
        <PhoneFrame scale={0.8} label="vikram · seller · हिन्दी">
          <div className="p-5 flex flex-col gap-4">
            <StatusPill tone="live">LIVE ASSAY</StatusPill>
            <VelvetCard variant="raised">
              <div className="num text-[28px] font-extrabold text-neo-paccha">4,820 rpm</div>
              <div className="text-[12px] text-muted">scale 0.8</div>
            </VelvetCard>
          </div>
        </PhoneFrame>
        <PhoneFrame scale={1} label="full scale · 1.0">
          <div className="p-5 flex flex-col gap-4">
            <StatusPill tone="frozen">FROZEN</StatusPill>
            <VelvetCard>
              <div className="num text-[28px] font-extrabold text-fg">90 s</div>
              <div className="text-[12px] text-muted">scale 1.0</div>
            </VelvetCard>
          </div>
        </PhoneFrame>
        <PhoneBack scale={0.6} />
      </div>
    </div>
  );
}
