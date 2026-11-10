import { useEffect, useRef, useState } from "react";
import { Button } from "@heroui/react";
import { projectMomentum } from "../lib/apple-physics";
import {
  DEMO_RPM,
  DEMO_SERIAL,
  captureFrame,
  captureMicPcmBase64,
  drawSimulatedFrame,
  laplacianVariance,
  phashRgba,
  synthMotorPcmBase64,
} from "../lib/assay";

export interface AssayCapture {
  jpegBase64: string;
  thumbnail: string;
  blurLaplacian: number;
  localPhash: string;
  audioPcmBase64: string;
  sampleRate: number;
  simulated: boolean;
}

const W = 320;
const H = 240;
const MARGIN = 16;

/**
 * Draggable picture-in-picture video assay loupe (F-05).
 * 1:1 drag via setPointerCapture; on release, momentum is projected (WWDC formula) and the loupe
 * snaps to the nearest corner of the container.
 */
export function AssayLoupe(props: {
  simulated: boolean;
  busy?: boolean;
  challenge?: { required_serial_plate?: string; min_motor_rpm?: number; challenge_nonce?: string } | null;
  onCapture: (c: AssayCapture) => void;
  onClose: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [pos, setPos] = useState({ x: -1, y: -1 });
  const [settling, setSettling] = useState(false);
  const [mode, setMode] = useState<"sim" | "cam">(props.simulated ? "sim" : "cam");
  const [camError, setCamError] = useState<string | null>(null);
  const [sharp, setSharp] = useState<number | null>(null);
  const drag = useRef<{ dx: number; dy: number; samples: { x: number; y: number; t: number }[] } | null>(null);

  // initial corner: bottom-right of the positioned parent
  useEffect(() => {
    const parent = wrapRef.current?.offsetParent as HTMLElement | null;
    if (parent && pos.x < 0) setPos({ x: parent.clientWidth - W - MARGIN, y: parent.clientHeight - H - 64 - MARGIN });
  }, [pos.x]);

  // camera / simulated stream
  useEffect(() => {
    let raf = 0;
    let cancelled = false;
    if (mode === "cam") {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCamError("No camera API in this browser, using the simulated HD stream");
        setMode("sim");
        return;
      }
      navigator.mediaDevices
        .getUserMedia({ video: { width: 640, height: 480 }, audio: true })
        .then((s) => {
          if (cancelled) return s.getTracks().forEach((t) => t.stop());
          streamRef.current = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            void videoRef.current.play();
          }
        })
        .catch(() => {
          setCamError("Camera declined or missing, using the simulated HD stream");
          setMode("sim");
        });
    } else {
      const ctx = canvasRef.current?.getContext("2d");
      const loop = (t: number) => {
        if (ctx) drawSimulatedFrame(ctx, 640, 480, t);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [mode]);

  // live sharpness readout (the WASM metric, TS fallback)
  useEffect(() => {
    const id = window.setInterval(() => {
      const src = mode === "sim" ? canvasRef.current : videoRef.current;
      if (!src) return;
      try {
        const f = captureFrame(src, 160, 120);
        setSharp(laplacianVariance(f.rgba, f.width, f.height));
      } catch {
        /* video not ready */
      }
    }, 700);
    return () => window.clearInterval(id);
  }, [mode]);

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    const el = wrapRef.current!;
    el.setPointerCapture(e.pointerId);
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y, samples: [{ x: e.clientX, y: e.clientY, t: performance.now() }] };
    setSettling(false);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    d.samples.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    if (d.samples.length > 4) d.samples.shift();
    setPos({ x: e.clientX - d.dx, y: e.clientY - d.dy });
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    const parent = wrapRef.current?.offsetParent as HTMLElement | null;
    if (!d || !parent) return;
    const a = d.samples[0];
    const b = d.samples[d.samples.length - 1];
    const dt = Math.max(1, b.t - a.t) / 1000;
    const vx = (b.x - a.x) / dt;
    const vy = (b.y - a.y) / dt;
    const px = pos.x + projectMomentum(vx);
    const py = pos.y + projectMomentum(vy);
    const maxX = parent.clientWidth - W - MARGIN;
    const maxY = parent.clientHeight - H - 64 - MARGIN;
    setSettling(true);
    setPos({ x: px < maxX / 2 ? MARGIN : maxX, y: py < maxY / 2 ? MARGIN : maxY });
  };

  const capture = async () => {
    const src = mode === "sim" ? canvasRef.current : videoRef.current;
    if (!src) return;
    const f = captureFrame(src);
    let audio = { base64: synthMotorPcmBase64(DEMO_RPM), sampleRate: 48000 };
    if (mode === "cam" && streamRef.current) {
      const mic = await captureMicPcmBase64(streamRef.current);
      if (mic) audio = mic;
    }
    props.onCapture({
      jpegBase64: f.jpegBase64,
      thumbnail: captureFrame(src, 160, 120).dataUrl,
      blurLaplacian: laplacianVariance(f.rgba, f.width, f.height),
      localPhash: phashRgba(f.rgba, f.width, f.height),
      audioPcmBase64: audio.base64,
      sampleRate: audio.sampleRate,
      simulated: mode === "sim",
    });
  };

  return (
    <div
      ref={wrapRef}
      role="dialog"
      aria-label="Live video assay loupe"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="absolute z-20 cursor-grab touch-none select-none overflow-hidden rounded-[20px] border hairline bg-paper shadow-[0_18px_50px_-12px_rgb(0_0_0/0.35)] active:cursor-grabbing"
      style={{
        width: W,
        transform: `translate3d(${Math.max(0, pos.x)}px, ${Math.max(0, pos.y)}px, 0)`,
        transition: settling ? "transform 420ms cubic-bezier(0.25, 1.25, 0.4, 1)" : "none",
        left: 0,
        top: 0,
      }}
    >
      <div className="relative bg-black" style={{ height: H - 72 }}>
        {mode === "sim" ? (
          <canvas ref={canvasRef} width={640} height={480} className="h-full w-full object-cover" />
        ) : (
          <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
        )}
        <div className="num absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[11px] text-white">
          {props.challenge?.required_serial_plate ?? DEMO_SERIAL}
        </div>
        <div className="num absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-[11px] text-white">
          Sharpness {sharp != null ? sharp.toFixed(0) : "—"} · min RPM {(props.challenge?.min_motor_rpm ?? 4800).toLocaleString("en-IN")}
        </div>
        <div className="absolute right-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[11px] text-white">{mode === "sim" ? "Simulated HD stream" : "Camera"}</div>
      </div>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <Button size="sm" variant="primary" isDisabled={props.busy} onPress={() => void capture()}>
          {props.busy ? "Verifying" : "Capture proof"}
        </Button>
        <Button size="sm" variant="ghost" onPress={() => setMode(mode === "sim" ? "cam" : "sim")}>
          {mode === "sim" ? "Use camera" : "Use simulated"}
        </Button>
        <button className="press ml-auto text-[12.5px] text-ink-3 hover:text-ink" onClick={props.onClose}>
          Close
        </button>
      </div>
      {camError ? <div className="px-3 pb-2 text-[12px] text-ink-3">{camError}</div> : null}
    </div>
  );
}
