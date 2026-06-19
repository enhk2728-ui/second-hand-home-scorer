import { describe, expect, it } from "vitest";
import { DEFAULT_STATE } from "./defaults";
import { deserializeState, serializeState } from "./storage";

describe("state serialization", () => {
  it("round-trips app state through JSON", () => {
    const text = serializeState(DEFAULT_STATE);
    const restored = deserializeState(text);
    expect(restored.properties).toHaveLength(3);
    expect(restored.indicators[0].id).toBe("commute_minutes");
    expect(restored.scoringProfiles[0].algorithm).toBe("fce");
  });
});
