import { useEffect, useRef, useState } from "react";
import { Button } from "@heroui/react";
import { Wordmark, Banner } from "../components/Chrome";
import { bootNexconn } from "../lib/nexconn-boot";
import { announceSellerReady, answerIncomingCalls, hangUp, readSellerHandoff } from "../lib/nexconn-call";

/** Seller side of the sandbox inspection call: connects as the seller and auto-answers the buyer's Nexconn call. */
export default function CallSeller() {
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState("Connecting to Nexconn as the seller");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Mudra · Seller inspection call";
    const h = readSellerHandoff();
    if (!h) {
      setError("Open this window from the sandbox's Call seller button.");
      return;
    }
    let stopAnswer: (() => void) | undefined;
    let stopAnnounce: (() => void) | undefined;
    let cancelled = false;
    void bootNexconn({ appKey: h.app_key, token: h.access_token, mode: h.mode }).then((status) => {
      if (cancelled) return;
      if (status !== "connected") {
        setError(`Nexconn client ${status}; the inspection call needs a live connection.`);
        return;
      }
      try {
        stopAnswer = answerIncomingCalls({ localVideo: localRef.current!, remoteVideo: remoteRef.current!, onState: setState });
        stopAnnounce = announceSellerReady(h.nexconn_user_id);
        setState(`Connected as ${h.nexconn_user_id}. Waiting for the buyer's call`);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
    return () => {
      cancelled = true;
      stopAnswer?.();
      stopAnnounce?.();
      void hangUp();
    };
  }, []);

  return (
    <div className="flex min-h-dvh flex-col gap-3 bg-canvas p-4">
      <div className="flex items-center gap-3">
        <Wordmark />
        <span className="text-[13px] text-ink-3">Seller inspection call</span>
      </div>
      {error ? <Banner tone="danger">{error}</Banner> : <p className="text-[13.5px] text-ink-2">{state}</p>}
      <div className="relative overflow-hidden rounded-[16px] border hairline bg-black" style={{ aspectRatio: "4 / 3" }}>
        <video ref={localRef} autoPlay muted playsInline className="h-full w-full object-cover" />
        <div className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[11px] text-white">Your camera, sent over Nexconn Call</div>
        <video ref={remoteRef} autoPlay playsInline className="absolute bottom-2 right-2 w-28 rounded-md border hairline object-cover" />
      </div>
      <p className="text-[12.5px] text-ink-3">Point the camera at the item. The buyer's loupe fingerprints what it receives over this call.</p>
      <div>
        <Button size="sm" variant="outline" onPress={() => void hangUp().then(() => window.close())}>
          Hang up
        </Button>
      </div>
    </div>
  );
}
