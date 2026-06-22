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

describe("deserializeState backward compatibility", () => {
  it("fills missing scoringProfiles from defaults", () => {
    const legacy = JSON.stringify({
      indicators: DEFAULT_STATE.indicators,
      properties: DEFAULT_STATE.properties,
      selectedPropertyId: null,
    });
    const restored = deserializeState(legacy);
    expect(restored.scoringProfiles).toBeDefined();
    expect(restored.scoringProfiles.length).toBeGreaterThan(0);
    expect(restored.activeProfileId).toBeDefined();
  });

  it("fills missing activeProfileId from existing profiles", () => {
    const legacy = JSON.stringify({
      indicators: DEFAULT_STATE.indicators,
      properties: DEFAULT_STATE.properties,
      scoringProfiles: [
        {
          id: "custom-fce",
          name: "Custom",
          algorithm: "fce",
          objectiveWeightEnabled: false,
          objectiveWeightMethod: "entropy" as const,
          subjectiveBlend: 1,
        },
      ],
      selectedPropertyId: null,
    });
    const restored = deserializeState(legacy);
    expect(restored.activeProfileId).toBe("custom-fce");
    expect(restored.scoringProfiles[0]!.ahpComparisons).toBeDefined();
  });

  it("falls back to first profile when activeProfileId references a missing profile", () => {
    const legacy = JSON.stringify({
      indicators: DEFAULT_STATE.indicators,
      properties: DEFAULT_STATE.properties,
      scoringProfiles: [
        {
          id: "real-profile",
          name: "Real",
          algorithm: "fce",
          objectiveWeightEnabled: false,
          objectiveWeightMethod: "entropy" as const,
          subjectiveBlend: 1,
          ahpComparisons: {},
        },
      ],
      activeProfileId: "deleted-profile",
      selectedPropertyId: null,
    });
    const restored = deserializeState(legacy);
    expect(restored.activeProfileId).toBe("real-profile");
  });

  it("preserves imported indicators and properties when valid", () => {
    const legacy = JSON.stringify({
      indicators: [
        {
          id: "custom-ind",
          name: "Custom",
          category: "test",
          inputType: "rating10",
          direction: "higherBetter",
          subjectiveWeight: 3,
          objectiveWeight: 0,
          finalWeight: 3,
          objectiveWeightEnabled: false,
          objectiveWeightMethod: "entropy",
          participatesInScoring: true,
          participatesInObjectiveWeight: true,
          isHardFailCapable: false,
          fceRule: { type: "rating10" },
        },
      ],
      properties: [
        {
          id: "custom-prop",
          name: "Custom Prop",
          community: "",
          address: "",
          link: "",
          totalPrice: 300,
          area: 70,
          unitPrice: "",
          notes: "",
          valuesByIndicatorId: {},
          hardFails: [],
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      selectedPropertyId: "custom-prop",
    });
    const restored = deserializeState(legacy);
    expect(restored.indicators).toHaveLength(1);
    expect(restored.indicators[0]!.id).toBe("custom-ind");
    expect(restored.properties).toHaveLength(1);
    expect(restored.properties[0]!.name).toBe("Custom Prop");
    expect(restored.selectedPropertyId).toBe("custom-prop");
  });

  it("preserves selectedPropertyId when it matches an imported property", () => {
    const legacy = JSON.stringify({
      indicators: DEFAULT_STATE.indicators,
      properties: DEFAULT_STATE.properties,
      scoringProfiles: DEFAULT_STATE.scoringProfiles,
      activeProfileId: DEFAULT_STATE.activeProfileId,
      selectedPropertyId: "sample-b",
    });
    const restored = deserializeState(legacy);
    expect(restored.selectedPropertyId).toBe("sample-b");
  });

  it("clears selectedPropertyId when it references a missing property", () => {
    const legacy = JSON.stringify({
      indicators: DEFAULT_STATE.indicators,
      properties: [],
      scoringProfiles: DEFAULT_STATE.scoringProfiles,
      activeProfileId: DEFAULT_STATE.activeProfileId,
      selectedPropertyId: "ghost-id",
    });
    const restored = deserializeState(legacy);
    expect(restored.selectedPropertyId).toBeNull();
  });

  it("ensures every profile has ahpComparisons", () => {
    const legacy = JSON.stringify({
      indicators: DEFAULT_STATE.indicators,
      properties: DEFAULT_STATE.properties,
      scoringProfiles: [
        {
          id: "p1",
          name: "Profile 1",
          algorithm: "fce",
          objectiveWeightEnabled: false,
          objectiveWeightMethod: "entropy",
          subjectiveBlend: 1,
        },
        {
          id: "p2",
          name: "Profile 2",
          algorithm: "fce",
          objectiveWeightEnabled: true,
          objectiveWeightMethod: "entropy",
          subjectiveBlend: 0.5,
        },
      ],
      activeProfileId: "p2",
      selectedPropertyId: null,
    });
    const restored = deserializeState(legacy);
    expect(restored.scoringProfiles[0]!.ahpComparisons).toEqual({});
    expect(restored.scoringProfiles[1]!.ahpComparisons).toEqual({});
    expect(restored.activeProfileId).toBe("p2");
  });
});
