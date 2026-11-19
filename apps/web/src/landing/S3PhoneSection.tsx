import { PhoneCluster } from "../hero/PhoneCluster";
import { FadeUp } from "../motion/FadeUp";

export function S3PhoneSection() {
  return (
    <section className="relative w-full bg-pop-black py-[96px] md:py-[160px] px-5 md:px-10 overflow-hidden">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center text-center">
        <FadeUp>
          <h2 className="t-mega lowercase text-fg">
            <span className="block">all that you're owed.</span>
            <span className="block">and nothing less.</span>
          </h2>
          <p className="t-lead mx-auto mt-6 max-w-[520px] lowercase text-fg-2">
            if you're a samadhan member, every rupee you send waits in a sealed
            vault until the product proves itself on camera. nothing moves until
            both of you say so.
          </p>
        </FadeUp>

        <div className="mt-[64px] md:mt-[120px] w-full">
          <PhoneCluster />
        </div>
      </div>
    </section>
  );
}
