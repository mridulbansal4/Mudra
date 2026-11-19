import { describe, expect, it } from "vitest";
import { createDemoStore, replayToStep } from "./store";
import { TOTAL_SCRIPT_STEPS } from "./script";

describe("demo store (§8.5)", () => {
  it("starts in CREATED on B1 and S1 and rejects invalid FSM transitions", () => {
    const store = createDemoStore("happy", false);
    expect(store.getState().fsm).toBe("CREATED");
    expect(store.getState().buyerScreen).toBe("B1");
    expect(store.getState().sellerScreen).toBe("S1");

    // RELEASE_FUNDS is invalid from CREATED
    store.dispatch({ type: "FSM_TRANSITION", action: "RELEASE_FUNDS" }, false);
    expect(store.getState().fsm).toBe("CREATED");
    expect(store.getState().eventLog).toHaveLength(0);

    // LOCK_ESCROW is valid from CREATED -> FUNDED
    store.dispatch({ type: "FSM_TRANSITION", action: "LOCK_ESCROW" }, false);
    expect(store.getState().fsm).toBe("FUNDED");
    expect(store.getState().eventLog).toHaveLength(1);
    store.destroy();
  });

  it("plays all 8 happy-path steps deterministically and ends in RELEASED", () => {
    const store = createDemoStore("happy", true);
    for (let i = 1; i <= TOTAL_SCRIPT_STEPS; i++) {
      store.dispatch({ type: "NEXT_STEP" }, false);
      expect(store.getState().step).toBe(i);
    }
    const finalState = store.getState();
    expect(finalState.fsm).toBe("RELEASED");
    expect(finalState.buyerScreen).toBe("B5");
    expect(finalState.sellerScreen).toBe("S5");
    expect(finalState.rpm).toBe(4820);
    expect(finalState.frameMatch).toBe(96);
    store.destroy();
  });

  it("plays all 8 dispute-branch steps deterministically and ends in ARBITRATED_SPLIT", () => {
    const store = createDemoStore("dispute", true);
    for (let i = 1; i <= TOTAL_SCRIPT_STEPS; i++) {
      store.dispatch({ type: "NEXT_STEP" }, false);
    }
    const finalState = store.getState();
    expect(finalState.fsm).toBe("ARBITRATED_SPLIT");
    expect(finalState.buyerScreen).toBe("B7");
    expect(finalState.sellerScreen).toBe("S6");
    expect(finalState.verdict).toEqual({ buyerPct: 30, sellerPct: 70 });
    store.destroy();
  });

  it("replays to any step deterministically via JUMP_TO_STEP and PREV_STEP", () => {
    const store = createDemoStore("happy", false);
    store.dispatch({ type: "JUMP_TO_STEP", step: 6 }, false);
    const at6 = store.getState();
    expect(at6.step).toBe(6);
    expect(at6.fsm).toBe("INSPECTION_LIVE");
    expect(at6.rpm).toBe(4820);

    store.dispatch({ type: "PREV_STEP" }, false);
    const at5 = store.getState();
    expect(at5.step).toBe(5);
    expect(at5.fsm).toBe("INSPECTION_LIVE");

    const direct5 = replayToStep(5, "happy", false);
    expect(at5).toEqual(direct5);
    store.destroy();
  });
});
