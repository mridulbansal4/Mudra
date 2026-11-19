import { Logo, LogoMark } from "../brand/Logo";

export default function Scratch() {
  return (
    <div className="min-h-dvh bg-pop-black p-12 text-fg flex flex-col gap-12">
      <div className="eyebrow text-neo-paccha">SCRATCH PREVIEW · T3 LOGO</div>
      <div className="flex items-center gap-16">
        <Logo intro />
        <Logo layout="row" />
        <LogoMark size={48} className="text-neo-paccha" />
      </div>
    </div>
  );
}
