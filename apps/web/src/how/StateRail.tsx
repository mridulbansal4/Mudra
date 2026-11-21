import { FSM_STATES, type FsmState } from "@mudra/shared-types";

export interface StateRailProps {
  activeChapterIndex: number;
  onSelectChapter: (index: number) => void;
}

function formatStateLabel(state: FsmState): string {
  return state.toLowerCase().replace(/_/g, " ");
}

export function StateRail({
  activeChapterIndex,
  onSelectChapter,
}: StateRailProps) {
  const happyStates = FSM_STATES.slice(0, 5);
  const disputeStates = FSM_STATES.slice(5, 8);

  const getHappyTone = (idx: number): "current" | "past" | "future" => {
    if (activeChapterIndex === idx) return "current";
    if (activeChapterIndex < 5 && idx < activeChapterIndex) return "past";
    if (activeChapterIndex === 5 && idx <= 2) return "past";
    return "future";
  };

  const isDisputeCurrent = activeChapterIndex === 5;

  return (
    <div
      className="sticky top-[60px] md:top-[72px] z-30 w-full px-5 py-3.5 md:px-10"
      style={{
        backgroundColor: "rgba(13, 13, 13, 0.88)",
        backdropFilter: "blur(14px)",
        borderTop: "1px solid var(--hairline)",
        borderBottom: "1px solid var(--hairline)",
      }}
    >
      <div className="mx-auto flex max-w-[1200px] flex-col gap-2">
        {/* Top line: 5 happy-path states */}
        <div className="no-scrollbar flex items-center gap-4 overflow-x-auto md:gap-8">
          {happyStates.map((st, idx) => {
            const tone = getHappyTone(idx);
            return (
              <button
                key={st}
                type="button"
                onClick={() => onSelectChapter(idx)}
                className="flex shrink-0 items-center gap-2.5 bg-transparent border-0 p-1 text-[12.5px] font-semibold lowercase cursor-pointer press"
                style={{
                  color:
                    tone === "current"
                      ? "#ffffff"
                      : tone === "past"
                        ? "rgba(255,255,255,0.4)"
                        : "var(--dim)",
                }}
              >
                <span
                  aria-hidden="true"
                  className="size-[8px] shrink-0"
                  style={{
                    borderRadius: 0,
                    backgroundColor:
                      tone === "current"
                        ? "var(--neo-paccha)"
                        : tone === "past"
                          ? "rgba(255,255,255,0.4)"
                          : "var(--dim)",
                  }}
                />
                <span>{formatStateLabel(st)}</span>
              </button>
            );
          })}
        </div>

        {/* Bottom branch: 3 dispute states connected below funded...assay verified with an angled 1px line */}
        <div className="no-scrollbar flex items-center gap-3 overflow-x-auto pl-6 md:pl-[124px]">
          <svg
            aria-hidden="true"
            viewBox="0 0 36 16"
            className="h-[16px] w-[36px] shrink-0"
            fill="none"
          >
            <path
              d="M2 0 L14 12 L36 12"
              stroke={isDisputeCurrent ? "#e5fe40" : "rgba(255,255,255,0.22)"}
              strokeWidth="1"
            />
          </svg>
          {disputeStates.map((st, idx) => (
            <button
              key={st}
              type="button"
              onClick={() => onSelectChapter(5)}
              className="flex shrink-0 items-center gap-2 bg-transparent border-0 p-1 text-[12px] font-semibold lowercase cursor-pointer press"
              style={{
                color: isDisputeCurrent ? "#ffffff" : "var(--dim)",
              }}
            >
              <span
                aria-hidden="true"
                className="size-[7px] shrink-0"
                style={{
                  borderRadius: 0,
                  backgroundColor: isDisputeCurrent
                    ? "var(--neo-paccha)"
                    : "var(--dim)",
                }}
              />
              <span>{formatStateLabel(st)}</span>
              {idx < disputeStates.length - 1 ? (
                <span aria-hidden="true" className="ml-1 text-dim">
                  /
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
