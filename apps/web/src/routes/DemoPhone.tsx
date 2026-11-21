import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useParams } from "react-router";
import { PhoneScreenRouter } from "../demo/screens/PhoneScreenRouter";
import { createDemoStore } from "../demo/store";
import { PhoneFrame } from "../ui/PhoneFrame";

export default function DemoPhone() {
  const { role } = useParams<{ role: string }>();
  const isSeller = role === "seller";

  const store = useMemo(() => createDemoStore("happy", false), []);
  useEffect(() => {
    document.title = "Mudra";
    return () => store.destroy();
  }, [isSeller, store]);

  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);

  const [scale, setScale] = useState(0.92);
  useEffect(() => {
    const update = () => {
      const s = Math.min(1, Math.max(0.65, (window.innerHeight - 64) / 868));
      setScale(Number(s.toFixed(2)));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div className="relative flex min-h-dvh w-full items-center justify-center bg-pop-void p-4 text-fg">
      <div
        className="fixed top-3 left-3 z-30 inline-flex items-center gap-2 px-3 py-1.5 text-[11.5px] font-semibold lowercase text-fg-2"
        style={{
          borderRadius: "999px",
          backgroundColor: "var(--card-2)",
          border: "1px solid var(--hairline)",
        }}
      >
        <span
          aria-hidden="true"
          className="size-[6px] rounded-full bg-neo-paccha"
        />
        <span>
          connected · seeing {isSeller ? "vikram's" : "rajesh's"} phone
        </span>
      </div>

      <PhoneFrame
        scale={scale}
        label={
          isSeller ? (
            <>
              vikram · seller · <span lang="hi">हिन्दी</span>
            </>
          ) : (
            <>
              rajesh · buyer · <span lang="ta">தமிழ்</span>
            </>
          )
        }
      >
        <PhoneScreenRouter
          screen={isSeller ? state.sellerScreen : state.buyerScreen}
          state={state}
          dispatch={store.dispatch}
        />
      </PhoneFrame>
    </div>
  );
}
