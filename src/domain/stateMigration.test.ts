import { describe, expect, it } from "vitest";
import { DEFAULT_INDICATORS, DEFAULT_STATE } from "./defaults";
import {
  detectMissingDefaultIndicators,
  mergeMissingDefaults,
  needsIndicatorMigration,
  hasSeenOnboarding,
  setStoredIndicatorVersion,
  CURRENT_INDICATOR_VERSION,
  INDICATOR_VERSION_KEY,
  ONBOARDING_KEY,
} from "./stateMigration";
import type { Indicator } from "./types";

function clearStorage() {
  window.localStorage.removeItem(INDICATOR_VERSION_KEY);
  window.localStorage.removeItem(ONBOARDING_KEY);
}

describe("detectMissingDefaultIndicators", () => {
  it("returns empty array when all defaults are present", () => {
    const missing = detectMissingDefaultIndicators(DEFAULT_INDICATORS);
    expect(missing).toHaveLength(0);
  });

  it("detects missing default indicators", () => {
    const partial = DEFAULT_INDICATORS.slice(0, 3);
    const missing = detectMissingDefaultIndicators(partial);
    expect(missing.length).toBe(DEFAULT_INDICATORS.length - 3);
    expect(missing.every((m) => DEFAULT_INDICATORS.includes(m))).toBe(true);
  });

  it("returns all defaults when existing list is empty", () => {
    const missing = detectMissingDefaultIndicators([]);
    expect(missing).toHaveLength(DEFAULT_INDICATORS.length);
  });

  it("does not flag user-created custom indicators as missing", () => {
    const custom: Indicator = {
      id: "custom-one",
      name: "Custom",
      category: "test",
      inputType: "rating10",
      direction: "higherBetter",
      subjectiveWeight: 1,
      objectiveWeight: 0,
      finalWeight: 1,
      objectiveWeightEnabled: false,
      objectiveWeightMethod: "entropy",
      participatesInScoring: true,
      participatesInObjectiveWeight: true,
      isHardFailCapable: false,
      fceRule: { type: "rating10" },
    };
    const existing = [...DEFAULT_INDICATORS, custom];
    const missing = detectMissingDefaultIndicators(existing);
    expect(missing).toHaveLength(0);
  });
});

describe("mergeMissingDefaults", () => {
  it("returns unchanged when no defaults missing", () => {
    const result = mergeMissingDefaults(DEFAULT_INDICATORS);
    expect(result).toBe(DEFAULT_INDICATORS);
  });

  it("appends missing defaults after existing indicators", () => {
    const existing = DEFAULT_INDICATORS.slice(0, 2);
    const result = mergeMissingDefaults(existing);
    expect(result.slice(0, 2)).toEqual(existing);
    expect(result.length).toBe(DEFAULT_INDICATORS.length);
    // existing indicators still at front
    expect(result[0]!.id).toBe(existing[0]!.id);
    expect(result[1]!.id).toBe(existing[1]!.id);
    // missing defaults appended
    expect(result[2]!.id).toBe(DEFAULT_INDICATORS[2]!.id);
  });

  it("preserves user-modified indicators when merging", () => {
    const modified: Indicator[] = DEFAULT_INDICATORS.slice(0, 1).map((ind) => ({
      ...ind,
      name: "Modified Name",
    }));
    const result = mergeMissingDefaults(modified);
    expect(result[0]!.name).toBe("Modified Name");
    expect(result.length).toBe(DEFAULT_INDICATORS.length);
  });

  it("does not delete user indicators, properties, or scores", () => {
    // This is a logical test: mergeMissingDefaults only operates on indicators array
    // It does not touch properties or scores — those are handled at the AppState level
    const custom: Indicator = {
      id: "custom-user-ind",
      name: "User Custom",
      category: "custom",
      inputType: "rating10",
      direction: "higherBetter",
      subjectiveWeight: 2,
      objectiveWeight: 0,
      finalWeight: 2,
      objectiveWeightEnabled: false,
      objectiveWeightMethod: "entropy",
      participatesInScoring: true,
      participatesInObjectiveWeight: true,
      isHardFailCapable: false,
      fceRule: { type: "rating10" },
    };
    const existing = [custom, ...DEFAULT_INDICATORS.slice(0, 2)];
    const result = mergeMissingDefaults(existing);
    // user custom stays first
    expect(result[0]!.id).toBe("custom-user-ind");
    expect(result[0]!.subjectiveWeight).toBe(2);
    // all defaults present
    expect(result.length).toBe(1 + DEFAULT_INDICATORS.length);
  });
});

describe("migration version tracking", () => {
  it("detects when migration is needed (no version stored)", () => {
    clearStorage();
    expect(needsIndicatorMigration()).toBe(true);
  });

  it("detects when migration is not needed (current version)", () => {
    clearStorage();
    setStoredIndicatorVersion(CURRENT_INDICATOR_VERSION);
    expect(needsIndicatorMigration()).toBe(false);
  });

  it("detects outdated version", () => {
    clearStorage();
    setStoredIndicatorVersion("v1");
    expect(needsIndicatorMigration()).toBe(true);
  });

  it("detects first-time visit (no onboarding seen)", () => {
    clearStorage();
    expect(hasSeenOnboarding()).toBe(false);
  });

  it("returns false for migration after calling setStoredIndicatorVersion with current", () => {
    clearStorage();
    setStoredIndicatorVersion(CURRENT_INDICATOR_VERSION);
    expect(needsIndicatorMigration()).toBe(false);
  });
});

describe("no state load without defaults fallback", () => {
  it("does not break when DEFAULT_STATE is the source of truth", () => {
    // DEFAULT_STATE should always be intact
    expect(DEFAULT_STATE.indicators.length).toBeGreaterThan(0);
    expect(DEFAULT_STATE.properties.length).toBeGreaterThan(0);
  });
});
