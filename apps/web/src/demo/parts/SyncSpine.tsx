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
    <div className="flex w-full min-[1100px]:w-[240px] flex-col items-center justify-center gap-5 select-none">
      {/* Animated horizontal packet between phones */}
      <div className="relative h-[28px] w-full flex items-center justify-center overflow-hidden">
        <div
          aria-hidden="true"
          className="h-[1px] w-full"
          style={{ backgroundColor: "var(--hairline)" }}
        />
        {packet && !reduced ? (
          <motion.div
            key={packet.seq}
            initial={{ x: toRight ? -95 : 95, opacity: 0 }}
            animate={{ x: toRight ? 95 : -95, opacity: [0, 1, 1, 0] }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            aria-hidden="true"
            className={`absolute flex items-center ${toRight ? "flex-row" : "flex-row-reverse"}`}
          >
            <span
              className="h-[2px] w-[40px]"
              style={{
                background: toRight
                  ? "linear-gradient(90deg, transparent, #e5fe40)"
                  : "linear-gradient(270deg, transparent, #e5fe40)",
              }}
            />
            <span
              className="size-[10px] bg-neo-paccha shrink-0"
              style={{ borderRadius: 0 }}
            />
          </motion.div>
        ) : (
          <span
            aria-hidden="true"
            className="absolute size-[8px] bg-neo-paccha"
            style={{ borderRadius: 0 }}
          />
        )}
      </div>

      {/* 8 FSM states list (vertical on >=1100px, horizontal wrap below 1100px) */}
      <div className="flex flex-wrap min-[1100px]:flex-col justify-center gap-2 w-full px-2">
        {FSM_STATES.map((s) => {
          const active = state.fsm === s;
          return (
            <div
              key={s}
              className={`flex items-center gap-2.5 px-2.5 py-1 text-[12px] font-semibold lowercase transition-colors ${
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
              <span>{s.toLowerCase().replace(/_/g, " ")}</span>
            </div>
          );
        })}
      </div>

      {/* Latest event log line in mono 11px --muted */}
      <div className="num min-h-[32px] w-full text-center font-mono text-[11px] lowercase text-muted px-2">
        {lastEvent
          ? `${lastEvent.action} · ${lastEvent.from.toLowerCase()} → ${lastEvent.to.toLowerCase()} · ${lastEvent.latencyMs.toFixed(1)} ms`
          : "CREATED · awaiting first move · 0.0 ms"}
      </div>
    </div>
  );
}
