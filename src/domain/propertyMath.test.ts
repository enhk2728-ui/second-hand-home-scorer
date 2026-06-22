import { describe, expect, it } from "vitest";
import { calculateUnitPriceYuanPerSqm } from "./propertyMath";

describe("calculateUnitPriceYuanPerSqm", () => {
  it("calculates unit price for valid inputs", () => {
    expect(calculateUnitPriceYuanPerSqm(520, 89)).toBe(58426.97);
    expect(calculateUnitPriceYuanPerSqm(100, 50)).toBe(20000);
    expect(calculateUnitPriceYuanPerSqm(1000, 100)).toBe(100000);
  });

  it("returns empty string for empty totalPrice", () => {
    expect(calculateUnitPriceYuanPerSqm("", 89)).toBe("");
  });

  it("returns empty string for empty area", () => {
    expect(calculateUnitPriceYuanPerSqm(520, "")).toBe("");
  });

  it("returns empty string for both empty", () => {
    expect(calculateUnitPriceYuanPerSqm("", "")).toBe("");
  });

  it("returns empty string for zero area", () => {
    expect(calculateUnitPriceYuanPerSqm(520, 0)).toBe("");
  });

  it("returns empty string for zero price", () => {
    expect(calculateUnitPriceYuanPerSqm(0, 89)).toBe("");
  });

  it("returns empty string for negative inputs", () => {
    expect(calculateUnitPriceYuanPerSqm(-100, 50)).toBe("");
  });

  it("returns empty string for NaN", () => {
    expect(calculateUnitPriceYuanPerSqm(NaN, 50)).toBe("");
    expect(calculateUnitPriceYuanPerSqm(520, NaN)).toBe("");
  });

  it("rounds to 2 decimal places", () => {
    const result = calculateUnitPriceYuanPerSqm(500, 89);
    // 500万 / 89m² = 5,000,000 / 89 = 56179.775...
    expect(result).not.toBe("");
    if (result !== "") {
      const decimals = String(result).split(".")[1]?.length ?? 0;
      expect(decimals).toBeLessThanOrEqual(2);
    }
  });
});
