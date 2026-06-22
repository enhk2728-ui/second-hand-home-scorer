import { describe, expect, it } from "vitest";
import {
  normalizeAhpValue,
  setAhpComparison,
  buildAhpMatrix,
  calculateAhpWeights,
  calculateAhpConsistency,
  calculateAhp,
  applyAhpWeightsFromMatrix,
  generateEqualAhpComparisons,
  generateRankedAhpComparisons,
} from "./ahp";
import type { AhpComparisonMap, Indicator } from "./types";

function makeIndicator(overrides: Partial<Indicator> & { id: string }): Indicator {
  return {
    name: overrides.id,
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
    ...overrides,
  };
}

describe("normalizeAhpValue", () => {
  it("returns valid AHP values unchanged", () => {
    expect(normalizeAhpValue(1)).toBe(1);
    expect(normalizeAhpValue(3)).toBe(3);
    expect(normalizeAhpValue(9)).toBe(9);
    expect(normalizeAhpValue(1 / 3)).toBeCloseTo(1 / 3);
    expect(normalizeAhpValue(1 / 9)).toBeCloseTo(1 / 9);
  });

  it("clamps to nearest valid value", () => {
    expect(normalizeAhpValue(3.2)).toBe(3);
    expect(normalizeAhpValue(6.6)).toBe(7);
    expect(normalizeAhpValue(0.3)).toBeCloseTo(1 / 3);
  });

  it("returns 1 for non-finite values", () => {
    expect(normalizeAhpValue(NaN)).toBe(1);
    expect(normalizeAhpValue(Infinity)).toBe(1);
  });
});

describe("setAhpComparison", () => {
  it("sets a comparison and its reciprocal", () => {
    const comparisons: AhpComparisonMap = {};
    const next = setAhpComparison(comparisons, "a", "b", 3);
    expect(next["a"]!["b"]).toBe(3);
    expect(next["b"]!["a"]).toBeCloseTo(1 / 3);
  });

  it("does not mutate the original map", () => {
    const original: AhpComparisonMap = {};
    setAhpComparison(original, "a", "b", 5);
    expect(original["a"]).toBeUndefined();
  });

  it("preserves existing unrelated comparisons", () => {
    const original: AhpComparisonMap = { a: { c: 7 }, c: { a: 1 / 7 } };
    const next = setAhpComparison(original, "a", "b", 5);
    expect(next["a"]!["c"]).toBe(7);
  });
});

describe("buildAhpMatrix", () => {
  it("builds reciprocal matrix from comparison map", () => {
    const indicators = [
      makeIndicator({ id: "a" }),
      makeIndicator({ id: "b" }),
      makeIndicator({ id: "c" }),
    ];
    const comparisons: AhpComparisonMap = {
      a: { b: 3, c: 5 },
      b: { a: 1 / 3, c: 1 / 2 },
      c: { a: 1 / 5, b: 2 },
    };

    const matrix = buildAhpMatrix(indicators, comparisons);
    expect(matrix[0]![0]).toBe(1);
    expect(matrix[1]![1]).toBe(1);
    expect(matrix[2]![2]).toBe(1);
    expect(matrix[0]![1]).toBe(3);
    expect(matrix[1]![0]).toBeCloseTo(1 / 3);
    expect(matrix[0]![2]).toBe(5);
    expect(matrix[2]![0]).toBeCloseTo(1 / 5);
    expect(matrix[1]![2]).toBeCloseTo(1 / 2);
    expect(matrix[2]![1]).toBe(2);
  });

  it("missing values default to 1", () => {
    const indicators = [
      makeIndicator({ id: "a" }),
      makeIndicator({ id: "b" }),
    ];
    const matrix = buildAhpMatrix(indicators, {});
    expect(matrix[0]![1]).toBe(1);
    expect(matrix[1]![0]).toBe(1);
  });

  it("returns empty matrix when no scoring indicators", () => {
    const indicators = [
      makeIndicator({ id: "a", participatesInScoring: false }),
    ];
    expect(buildAhpMatrix(indicators)).toEqual([]);
  });

  it("non-scoring indicators are excluded", () => {
    const indicators = [
      makeIndicator({ id: "a" }),
      makeIndicator({ id: "b", participatesInScoring: false }),
      makeIndicator({ id: "c" }),
    ];
    const matrix = buildAhpMatrix(indicators);
    // Only 2x2 matrix for a and c
    expect(matrix).toHaveLength(2);
    expect(matrix[0]).toHaveLength(2);
    expect(matrix[1]).toHaveLength(2);
  });
});

describe("calculateAhpWeights", () => {
  it("weights sum to 1", () => {
    const indicators = [
      makeIndicator({ id: "a" }),
      makeIndicator({ id: "b" }),
      makeIndicator({ id: "c" }),
    ];
    const weights = calculateAhpWeights(indicators);
    const sum = Object.values(weights).reduce((s, w) => s + w, 0);
    expect(sum).toBeCloseTo(1, 4);
  });

  it("equal comparison matrix gives equal weights", () => {
    const indicators = [
      makeIndicator({ id: "a" }),
      makeIndicator({ id: "b" }),
      makeIndicator({ id: "c" }),
    ];
    // All 1s means all equally important
    const weights = calculateAhpWeights(indicators, {});
    expect(weights["a"]).toBeCloseTo(1 / 3, 3);
    expect(weights["b"]).toBeCloseTo(1 / 3, 3);
    expect(weights["c"]).toBeCloseTo(1 / 3, 3);
  });

  it("excludes non-scoring indicators", () => {
    const indicators = [
      makeIndicator({ id: "a" }),
      makeIndicator({ id: "b", participatesInScoring: false }),
      makeIndicator({ id: "c" }),
    ];
    const weights = calculateAhpWeights(indicators);
    expect(weights["a"]).toBeDefined();
    expect(weights["b"]).toBeUndefined();
    expect(weights["c"]).toBeDefined();
    const sum = (weights["a"] ?? 0) + (weights["c"] ?? 0);
    expect(sum).toBeCloseTo(1, 4);
  });

  it("returns empty object for no indicators", () => {
    expect(calculateAhpWeights([])).toEqual({});
  });

  it("returns weight 1 for single indicator", () => {
    const indicators = [makeIndicator({ id: "a" })];
    const weights = calculateAhpWeights(indicators);
    expect(weights["a"]).toBeCloseTo(1, 4);
  });
});

describe("calculateAhpConsistency", () => {
  it("passes for n <= 2 with CR = 0", () => {
    const result = calculateAhpConsistency([[1]], [1]);
    expect(result.cr).toBe(0);
    expect(result.passed).toBe(true);

    const result2 = calculateAhpConsistency(
      [[1, 1], [1, 1]],
      [0.5, 0.5],
    );
    expect(result2.cr).toBe(0);
    expect(result2.passed).toBe(true);
  });

  it("perfectly consistent 3x3 matrix has CR close to 0", () => {
    // Perfectly consistent: a=3*b, a=5*c, so b=5/3*c
    const matrix = [
      [1, 3, 5],
      [1 / 3, 1, 5 / 3],
      [1 / 5, 3 / 5, 1],
    ];
    const weights = [0.652, 0.217, 0.130]; // geometric mean normalized
    const result = calculateAhpConsistency(matrix, weights);
    expect(result.cr).toBeLessThan(0.001);
    expect(result.passed).toBe(true);
  });

  it("inconsistent 3x3 matrix fails CR <= 0.1", () => {
    // Highly inconsistent: a >> b, b >> c, but a == c
    // Row 0: [1, 9, 1] → product = 9, GM = 9^(1/3)
    // Row 1: [1/9, 1, 9] → product = 1, GM = 1
    // Row 2: [1, 1/9, 1] → product = 1/9, GM = (1/9)^(1/3)
    const matrix = [
      [1, 9, 1],
      [1 / 9, 1, 9],
      [1, 1 / 9, 1],
    ];
    const gm = [Math.pow(9, 1 / 3), 1, Math.pow(1 / 9, 1 / 3)];
    const sumGm = gm.reduce((a, b) => a + b, 0);
    const weights = gm.map((w) => w / sumGm);
    const result = calculateAhpConsistency(matrix, weights);
    expect(result.cr).toBeGreaterThan(0.1);
    expect(result.passed).toBe(false);
  });
});

describe("calculateAhp", () => {
  it("returns full result with weights and consistency", () => {
    const indicators = [
      makeIndicator({ id: "a" }),
      makeIndicator({ id: "b" }),
      makeIndicator({ id: "c", participatesInScoring: false }),
    ];
    const result = calculateAhp(indicators);
    expect(result.activeIndicators).toHaveLength(2);
    expect(result.matrix).toHaveLength(2);
    expect(Object.keys(result.weights)).toHaveLength(2);
    expect(result.consistency.passed).toBe(true);
    expect(result.consistency.cr).toBe(0);
  });
});

describe("applyAhpWeightsFromMatrix", () => {
  it("updates weights for scoring indicators", () => {
    const indicators = [
      makeIndicator({ id: "a", subjectiveWeight: 99, finalWeight: 99 }),
      makeIndicator({ id: "b", subjectiveWeight: 99, finalWeight: 99 }),
    ];
    const result = applyAhpWeightsFromMatrix(indicators);
    expect(result[0]!.subjectiveWeight + result[1]!.subjectiveWeight).toBeCloseTo(1, 3);
    expect(result[0]!.finalWeight + result[1]!.finalWeight).toBeCloseTo(1, 3);
  });

  it("does not change non-scoring indicators", () => {
    const indicators = [
      makeIndicator({
        id: "a",
        participatesInScoring: false,
        subjectiveWeight: 5,
        finalWeight: 5,
      }),
    ];
    const result = applyAhpWeightsFromMatrix(indicators);
    expect(result[0]!.subjectiveWeight).toBe(5);
    expect(result[0]!.finalWeight).toBe(5);
  });

  it("rounds to 3 decimal places", () => {
    const indicators = [
      makeIndicator({ id: "a" }),
      makeIndicator({ id: "b" }),
      makeIndicator({ id: "c" }),
    ];
    const result = applyAhpWeightsFromMatrix(indicators);
    for (const ind of result) {
      if (!ind.participatesInScoring) continue;
      const str = String(ind.subjectiveWeight);
      const decimals = str.includes(".") ? str.split(".")[1]!.length : 0;
      expect(decimals).toBeLessThanOrEqual(3);
    }
  });

  it("uses custom comparisons when provided", () => {
    const indicators = [
      makeIndicator({ id: "a", subjectiveWeight: 1 }),
      makeIndicator({ id: "b", subjectiveWeight: 1 }),
      makeIndicator({ id: "c", subjectiveWeight: 1 }),
    ];
    const comparisons: AhpComparisonMap = {
      a: { b: 9, c: 9 },
      b: { a: 1 / 9, c: 1 },
      c: { a: 1 / 9, b: 1 },
    };
    const result = applyAhpWeightsFromMatrix(indicators, comparisons);
    expect(result[0]!.subjectiveWeight).toBeGreaterThan(result[1]!.subjectiveWeight);
    expect(result[0]!.subjectiveWeight).toBeGreaterThan(result[2]!.subjectiveWeight);
  });
});

describe("generateEqualAhpComparisons", () => {
  it("produces equal weights for all scoring indicators", () => {
    const indicators = [
      makeIndicator({ id: "a" }),
      makeIndicator({ id: "b" }),
      makeIndicator({ id: "c" }),
    ];
    const comparisons = generateEqualAhpComparisons(indicators);
    const weights = calculateAhpWeights(indicators, comparisons);
    expect(weights["a"]).toBeCloseTo(1 / 3, 3);
    expect(weights["b"]).toBeCloseTo(1 / 3, 3);
    expect(weights["c"]).toBeCloseTo(1 / 3, 3);
  });

  it("passes consistency check (CR = 0)", () => {
    const indicators = [
      makeIndicator({ id: "a" }),
      makeIndicator({ id: "b" }),
      makeIndicator({ id: "c" }),
      makeIndicator({ id: "d" }),
    ];
    const comparisons = generateEqualAhpComparisons(indicators);
    const result = calculateAhp(indicators, comparisons);
    expect(result.consistency.passed).toBe(true);
    expect(result.consistency.cr).toBeLessThan(0.001);
  });

  it("excludes non-scoring indicators", () => {
    const indicators = [
      makeIndicator({ id: "a" }),
      makeIndicator({ id: "b", participatesInScoring: false }),
      makeIndicator({ id: "c" }),
    ];
    const comparisons = generateEqualAhpComparisons(indicators);
    const weights = calculateAhpWeights(indicators, comparisons);
    expect(weights["a"]).toBeDefined();
    expect(weights["b"]).toBeUndefined();
    expect(weights["c"]).toBeDefined();
  });

  it("returns empty map for no scoring indicators", () => {
    const indicators = [makeIndicator({ id: "a", participatesInScoring: false })];
    expect(generateEqualAhpComparisons(indicators)).toEqual({});
  });
});

describe("generateRankedAhpComparisons", () => {
  it("produces descending weights in selected order", () => {
    const indicators = [
      makeIndicator({ id: "a" }),
      makeIndicator({ id: "b" }),
      makeIndicator({ id: "c" }),
      makeIndicator({ id: "d" }),
    ];
    const comparisons = generateRankedAhpComparisons(indicators, ["a", "b", "c", "d"]);
    const weights = calculateAhpWeights(indicators, comparisons);
    expect(weights["a"]!).toBeGreaterThan(weights["b"]!);
    expect(weights["b"]!).toBeGreaterThan(weights["c"]!);
    expect(weights["c"]!).toBeGreaterThan(weights["d"]!);
    const sum = Object.values(weights).reduce((s, w) => s + w, 0);
    expect(sum).toBeCloseTo(1, 4);
  });

  it("active order differs from ranked order: reversed produces correct weights", () => {
    // Regression test for Codex review finding:
    // active=[a,b,c] ranked=[c,b,a] — generateRankedAhpComparisons stores
    // comparisons[c][b], comparisons[c][a], comparisons[b][a]
    // but buildAhpMatrix reads in active order looking for a->b, a->c, b->c.
    // Without bidirectional lookup, all comparisons default to 1 (equal weights).
    const indicators = [
      makeIndicator({ id: "a" }),
      makeIndicator({ id: "b" }),
      makeIndicator({ id: "c" }),
    ];
    const comparisons = generateRankedAhpComparisons(indicators, ["c", "b", "a"]);
    const weights = calculateAhpWeights(indicators, comparisons);

    // c is most important, then b, then a
    expect(weights["c"]!).toBeGreaterThan(weights["b"]!);
    expect(weights["b"]!).toBeGreaterThan(weights["a"]!);
    const sum = Object.values(weights).reduce((s, w) => s + w, 0);
    expect(sum).toBeCloseTo(1, 4);

    // Verify the matrix is correctly reciprocal
    const matrix = buildAhpMatrix(indicators, comparisons);
    // a/c comparison should not be 1 (it should reflect c being more important)
    // a should be at position 0, c at position 2 in active order [a,b,c]
    const aVsC = matrix[0]![2]!;
    const cVsA = matrix[2]![0]!;
    expect(aVsC).toBeLessThan(1); // a is less important than c
    expect(aVsC).toBeCloseTo(1 / cVsA, 4); // reciprocal
  });

  it("passes consistency check with valid CR", () => {
    const indicators = [
      makeIndicator({ id: "a" }),
      makeIndicator({ id: "b" }),
      makeIndicator({ id: "c" }),
    ];
    const comparisons = generateRankedAhpComparisons(indicators, ["a", "b", "c"]);
    const result = calculateAhp(indicators, comparisons);
    expect(result.consistency.passed).toBe(true);
    expect(result.consistency.cr).toBeLessThanOrEqual(0.1);
  });

  it("appends missing active indicators in original order", () => {
    const indicators = [
      makeIndicator({ id: "a" }),
      makeIndicator({ id: "b" }),
      makeIndicator({ id: "c" }),
    ];
    // Only "b" in orderedIds, "a" and "c" appended
    const comparisons = generateRankedAhpComparisons(indicators, ["b"]);
    const weights = calculateAhpWeights(indicators, comparisons);
    // "b" should have highest weight (first in order)
    expect(weights["b"]!).toBeGreaterThan(weights["a"]!);
    const sum = Object.values(weights).reduce((s, w) => s + w, 0);
    expect(sum).toBeCloseTo(1, 4);
  });

  it("ignores orderedIds not in active set", () => {
    const indicators = [
      makeIndicator({ id: "a" }),
      makeIndicator({ id: "b" }),
    ];
    const comparisons = generateRankedAhpComparisons(indicators, ["ghost", "a", "b"]);
    const weights = calculateAhpWeights(indicators, comparisons);
    expect(weights["a"]!).toBeGreaterThan(weights["b"]!);
    expect(weights["ghost"]).toBeUndefined();
  });

  it("excludes non-scoring indicators", () => {
    const indicators = [
      makeIndicator({ id: "a" }),
      makeIndicator({ id: "b", participatesInScoring: false }),
      makeIndicator({ id: "c" }),
    ];
    const comparisons = generateRankedAhpComparisons(indicators, ["c", "b", "a"]);
    const weights = calculateAhpWeights(indicators, comparisons);
    expect(weights["a"]).toBeDefined();
    expect(weights["b"]).toBeUndefined();
    expect(weights["c"]).toBeDefined();
  });

  it("duplicate entries in orderedIds are de-duplicated", () => {
    const indicators = [
      makeIndicator({ id: "a" }),
      makeIndicator({ id: "b" }),
      makeIndicator({ id: "c" }),
    ];
    const comp1 = generateRankedAhpComparisons(indicators, ["a", "b", "c"]);
    const comp2 = generateRankedAhpComparisons(indicators, ["a", "a", "b", "c"]);
    const w1 = calculateAhpWeights(indicators, comp1);
    const w2 = calculateAhpWeights(indicators, comp2);
    expect(w1["a"]).toBeCloseTo(w2["a"]!, 4);
    expect(w1["b"]).toBeCloseTo(w2["b"]!, 4);
  });

  it("generates only valid Saaty values (1-9 and reciprocals)", () => {
    const validValues = new Set([
      1 / 9, 1 / 8, 1 / 7, 1 / 6, 1 / 5, 1 / 4, 1 / 3, 1 / 2,
      1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
    const indicators = Array.from({ length: 6 }, (_, i) =>
      makeIndicator({ id: `ind-${i}` }),
    );
    const comparisons = generateRankedAhpComparisons(indicators, indicators.map((ind) => ind.id));
    const matrix = buildAhpMatrix(indicators, comparisons);
    for (const row of matrix) {
      for (const val of row) {
        // Allow floating-point nearness to valid values
        const isClose = [...validValues].some((v) => Math.abs(val - v) < 1e-9);
        expect(isClose).toBe(true);
      }
    }
  });
});
