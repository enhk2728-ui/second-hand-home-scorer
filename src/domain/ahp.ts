import type { AhpComparisonMap, Indicator } from "./types";

/** Saaty's random index (RI) table for n = 1..10. For n > 10, use 1.49. */
const RI_TABLE: Record<number, number> = {
  1: 0,
  2: 0,
  3: 0.58,
  4: 0.90,
  5: 1.12,
  6: 1.24,
  7: 1.32,
  8: 1.41,
  9: 1.45,
  10: 1.49,
};

/** Valid AHP comparison values (Saaty 1-9 scale). */
const VALID_AHP_VALUES = new Set([
  1 / 9, 1 / 8, 1 / 7, 1 / 6, 1 / 5, 1 / 4, 1 / 3, 1 / 2,
  1,
  2, 3, 4, 5, 6, 7, 8, 9,
]);

/** Clamp a value to the nearest valid AHP comparison. */
function clampToValidAhp(value: number): number {
  let best = 1;
  let bestDist = Infinity;
  for (const v of VALID_AHP_VALUES) {
    const dist = Math.abs(value - v);
    if (dist < bestDist) {
      bestDist = dist;
      best = v;
    }
  }
  return best;
}

/**
 * Normalize a raw value to the nearest valid AHP comparison.
 * Returns 1 for non-finite values.
 */
export function normalizeAhpValue(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return clampToValidAhp(value);
}

/**
 * Set a pairwise comparison value with reciprocal enforcement.
 * Returns a new comparison map (immutable).
 */
export function setAhpComparison(
  comparisons: AhpComparisonMap,
  fromId: string,
  toId: string,
  value: number,
): AhpComparisonMap {
  const normalized = normalizeAhpValue(value);
  const next = { ...comparisons };

  // Ensure row exists
  next[fromId] = { ...(next[fromId] ?? {}) };
  next[fromId]![toId] = normalized;

  // Set reciprocal
  next[toId] = { ...(next[toId] ?? {}) };
  next[toId]![fromId] = 1 / normalized;

  return next;
}

/**
 * Build a square pairwise comparison matrix from indicators and optional comparison map.
 * Only active (participatesInScoring) indicators are included.
 * Diagonal is 1. Missing comparisons default to 1. Values are clamped to valid AHP scale.
 */
export function buildAhpMatrix(
  indicators: Indicator[],
  comparisons?: AhpComparisonMap,
): number[][] {
  const active = indicators.filter((ind) => ind.participatesInScoring);
  const n = active.length;
  if (n === 0) return [];

  const matrix: number[][] = Array.from({ length: n }, () => Array<number>(n).fill(1));

  for (let i = 0; i < n; i++) {
    matrix[i]![i] = 1;
    for (let j = i + 1; j < n; j++) {
      const fromId = active[i]!.id;
      const toId = active[j]!.id;
      const raw = comparisons?.[fromId]?.[toId];
      const value = raw !== undefined ? normalizeAhpValue(raw) : 1;
      matrix[i]![j] = value;
      matrix[j]![i] = 1 / value;
    }
  }

  return matrix;
}

export interface AhpConsistencyResult {
  lambdaMax: number;
  ci: number;
  ri: number;
  cr: number;
  passed: boolean;
}

export interface AhpCalculationResult {
  activeIndicators: Indicator[];
  matrix: number[][];
  weights: Record<string, number>;
  consistency: AhpConsistencyResult;
}

/**
 * Compute geometric mean weights from a pairwise matrix.
 */
export function calculateAhpWeights(
  indicators: Indicator[],
  comparisons?: AhpComparisonMap,
): Record<string, number> {
  const active = indicators.filter((ind) => ind.participatesInScoring);
  const n = active.length;
  if (n === 0) return {};

  const matrix = buildAhpMatrix(indicators, comparisons);

  const gm: number[] = matrix.map((row) => {
    const product = row.reduce((acc, val) => acc * val, 1);
    return Math.pow(product, 1 / n);
  });

  const sumGm = gm.reduce((acc, val) => acc + val, 0);

  const weights: Record<string, number> = {};
  for (let i = 0; i < n; i++) {
    weights[active[i]!.id] = gm[i]! / sumGm;
  }

  return weights;
}

/**
 * Compute AHP consistency metrics (lambdaMax, CI, RI, CR, pass/fail).
 * For n <= 2, CR = 0 and passes automatically.
 */
export function calculateAhpConsistency(
  matrix: number[][],
  weights: number[],
): AhpConsistencyResult {
  const n = matrix.length;

  if (n <= 2) {
    return { lambdaMax: n, ci: 0, ri: 0, cr: 0, passed: true };
  }

  // Compute Aw for each row
  const aw: number[] = matrix.map((row) =>
    row.reduce((acc, val, j) => acc + val * (weights[j] ?? 0), 0),
  );

  // lambdaMax = average(Aw[i] / weight[i])
  let lambdaSum = 0;
  for (let i = 0; i < n; i++) {
    if (weights[i] !== 0) {
      lambdaSum += aw[i]! / weights[i]!;
    }
  }
  const lambdaMax = lambdaSum / n;

  const ci = (lambdaMax - n) / (n - 1);
  const ri = RI_TABLE[n] ?? 1.49;
  const cr = ri === 0 ? 0 : ci / ri;
  const passed = cr <= 0.1;

  return { lambdaMax, ci, ri, cr, passed };
}

/**
 * Full AHP calculation: matrix, weights, and consistency.
 */
export function calculateAhp(
  indicators: Indicator[],
  comparisons?: AhpComparisonMap,
): AhpCalculationResult {
  const activeIndicators = indicators.filter((ind) => ind.participatesInScoring);
  const matrix = buildAhpMatrix(indicators, comparisons);
  const weights = calculateAhpWeights(indicators, comparisons);
  const weightsArray = activeIndicators.map((ind) => weights[ind.id] ?? 0);
  const consistency = calculateAhpConsistency(matrix, weightsArray);

  return { activeIndicators, matrix, weights, consistency };
}

/**
 * Apply AHP-computed subjective weights to indicators.
 * Only scoring indicators are updated. Weights rounded to 3 decimal places.
 * Non-scoring indicators are returned unchanged.
 */
export function applyAhpWeightsFromMatrix(
  indicators: Indicator[],
  comparisons?: AhpComparisonMap,
): Indicator[] {
  const weights = calculateAhpWeights(indicators, comparisons);

  return indicators.map((ind) => {
    if (ind.participatesInScoring && weights[ind.id] !== undefined) {
      const w = weights[ind.id]!;
      return {
        ...ind,
        subjectiveWeight: Math.round(w * 1000) / 1000,
        finalWeight: Math.round(w * 1000) / 1000,
      };
    }
    return ind;
  });
}
