import { FSM_STATES } from "@samadhan/shared-types";
import { motion } from "motion/react";
import { useReducedMotion } from "../../motion/hooks";
import type { DemoState } from "../store";

export interface SyncSpineProps {
  state: DemoState;
}

export function SyncSpine({ state }: SyncSpineProps) {
  const reduced = Boolean(useReducedMotion());
  const lastEvent = state.eventLog[state.eventLog.length - 1];
  const packet = state.lastPacket;
  const toRight = packet ? packet.to === "seller" : true;

  return (
    <div className="flex w-full min-[1100px]:w-[120px] flex-col items-center justify-center gap-5 select-none">
      {/* Animated horizontal SVG packet between phones */}
      <div className="relative h-[28px] w-full flex items-center justify-center overflow-hidden">
        <svg
          aria-hidden="true"
          viewBox="0 0 120 28"
          className="h-[28px] w-full overflow-visible"
        >
          <defs>
            <linearGradient id="spine-trail-right" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#e5fe40" stopOpacity="0" />
              <stop offset="100%" stopColor="#e5fe40" stopOpacity="1" />
            </linearGradient>
            <linearGradient id="spine-trail-left" x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#e5fe40" stopOpacity="0" />
              <stop offset="100%" stopColor="#e5fe40" stopOpacity="1" />
            </linearGradient>
          </defs>
          <line
            x1="0"
            y1="14"
            x2="120"
            y2="14"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
          {packet && !reduced ? (
            <motion.g
              key={packet.seq}
              initial={{ x: toRight ? -50 : 120, opacity: 0 }}
              animate={{ x: toRight ? 110 : -40, opacity: [0, 1, 1, 0] }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
            >
              {toRight ? (
                <>
                  <rect x="0" y="13" width="40" height="2" fill="url(#spine-trail-right)" />
                  <rect x="40" y="9" width="10" height="10" fill="#e5fe40" />
                </>
              ) : (
                <>
                  <rect x="0" y="9" width="10" height="10" fill="#e5fe40" />
                  <rect x="10" y="13" width="40" height="2" fill="url(#spine-trail-left)" />
                </>
              )}
            </motion.g>
          ) : (
            <rect x="55" y="9" width="10" height="10" fill="#e5fe40" />
          )}
        </svg>
      </div>

      {/* 8 FSM states list (vertical on >=1100px, horizontal wrap below 1100px) */}
      <div className="flex flex-wrap min-[1100px]:flex-col justify-center gap-1.5 w-full">
        {FSM_STATES.map((s) => {
          const active = state.fsm === s;
          return (
            <div
              key={s}
              className={`flex items-center gap-2 px-1 py-0.5 text-[11px] font-semibold lowercase transition-colors ${
                active ? "text-neo-paccha" : "text-muted"
              }`}
            >
              <span
                aria-hidden="true"
                className="size-[6px] shrink-0"
                style={{
                  borderRadius: 0,
                  backgroundColor: active ? "var(--neo-paccha)" : "#3d3d3d",
                }}
              />
              <span className="truncate">{s.toLowerCase().replace(/_/g, " ")}</span>
            </div>
          );
        })}
      </div>

      {/* Latest event log line in mono 11px --muted */}
      <div className="num min-h-[32px] w-full text-center font-mono text-[11px] lowercase text-muted px-1">
        {lastEvent
          ? `${lastEvent.action} · ${lastEvent.from.toLowerCase()} → ${lastEvent.to.toLowerCase()} · ${lastEvent.latencyMs.toFixed(1)} ms`
          : "CREATED · awaiting first move · 0.0 ms"}
      </div>
    </div>
  );
}
