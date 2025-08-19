import { CA } from "@arcana/ca-sdk";
import { debugInfo } from "../utils/debug";

export function setCAEvents(ca: CA) {
  const state = {
    steps: [] as {
      typeID: number;
      done: boolean;
    }[],
  };

  ca.caEvents.on("expected_steps", (data) => {
    state.steps = data.map((s: { typeID: number }) => ({ ...s, done: false }));
  });

  ca.caEvents.on("step_complete", (data) => {
    const v = state.steps.find((s) => {
      return s.typeID === data.typeID;
    });
    if (v) {
      v.done = true;
    }
  });
}

export function unsetCAEvents(ca: CA) {
  ca.caEvents.removeAllListeners();
}
