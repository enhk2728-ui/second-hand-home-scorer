import type { GradeKey, Indicator, MembershipVector, PropertyRecord, PropertyScore } from "./types";

export const GRADE_SCORES: Record<GradeKey, number> = {
  excellent: 100,
  good: 80,
  average: 60,
  poor: 30
};

export const EMPTY_MEMBERSHIP: MembershipVector = {
  excellent: 0,
  good: 0,
  average: 0,
  poor: 0
};

export function normalizeMembership(vector: MembershipVector): MembershipVector {
  const total = vector.excellent + vector.good + vector.average + vector.poor;
  if (total <= 0) return { ...EMPTY_MEMBERSHIP };
  return {
    excellent: vector.excellent / total,
    good: vector.good / total,
    average: vector.average / total,
    poor: vector.poor / total
  };
}

export function membershipFromRule(indicator: Indicator, rawValue: string | number | boolean | ""): MembershipVector | null {
  if (rawValue === "") return null;

  const rule = indicator.fceRule;

  if (rule.type === "rating10") {
    const value = Number(rawValue);
    if (!Number.isFinite(value)) return null;
    if (value >= 9) return { excellent: 1, good: 0, average: 0, poor: 0 };
    if (value >= 7) return { excellent: 0, good: 1, average: 0, poor: 0 };
    if (value >= 5) return { excellent: 0, good: 0, average: 1, poor: 0 };
    return { excellent: 0, good: 0, average: 0, poor: 1 };
  }

  if (rule.type === "numericThreshold") {
    const value = Number(rawValue);
    if (!Number.isFinite(value) || !rule.bands) return null;
    const band = rule.bands.find((item) => {
      const aboveMin = item.min === undefined || value > item.min;
      const belowMax = item.max === undefined || value <= item.max;
      return aboveMin && belowMax;
    });
    return band ? normalizeMembership(band.membership) : null;
  }

  if (rule.type === "selectMapping" && rule.options) {
    const option = rule.options.find((item) => item.value === String(rawValue));
    return option ? normalizeMembership(option.membership) : null;
  }

  if (rule.type === "booleanMapping" && rule.booleanMap) {
    const boolKey = String(Boolean(rawValue)) as "true" | "false";
    if (boolKey === "false") return null; // false booleans do not contribute to score
    return normalizeMembership(rule.booleanMap[boolKey]);
  }

  return null;
}

export function scoreMembership(vector: MembershipVector): number {
  return (
    vector.excellent * GRADE_SCORES.excellent +
    vector.good * GRADE_SCORES.good +
    vector.average * GRADE_SCORES.average +
    vector.poor * GRADE_SCORES.poor
  );
}

export function dominantGrade(vector: MembershipVector): GradeKey {
  return (Object.keys(vector) as GradeKey[]).reduce((best, key) => (vector[key] > vector[best] ? key : best), "excellent");
}

export function calculatePropertyScore(property: PropertyRecord, indicators: Indicator[]): PropertyScore {
  if (property.hardFails.length > 0) {
    return {
      propertyId: property.id,
      eliminated: true,
      hardFailReasons: property.hardFails,
      totalScore: 0,
      dominantGrade: "poor",
      membership: { ...EMPTY_MEMBERSHIP },
      categoryScores: {},
      indicatorScores: {}
    };
  }

  const totals: MembershipVector = { ...EMPTY_MEMBERSHIP };
  const categoryMembership: Record<string, MembershipVector> = {};
  const categoryWeights: Record<string, number> = {};
  const indicatorScores: Record<string, number> = {};
  let totalWeight = 0;

  for (const indicator of indicators) {
    if (!indicator.participatesInScoring) continue;
    const membership = membershipFromRule(indicator, property.valuesByIndicatorId[indicator.id] ?? "");
    if (!membership) continue;

    const weight = Math.max(0, indicator.finalWeight || indicator.subjectiveWeight);
    if (weight <= 0) continue;

    totals.excellent += membership.excellent * weight;
    totals.good += membership.good * weight;
    totals.average += membership.average * weight;
    totals.poor += membership.poor * weight;
    totalWeight += weight;

    categoryMembership[indicator.category] ??= { ...EMPTY_MEMBERSHIP };
    categoryWeights[indicator.category] ??= 0;
    categoryMembership[indicator.category].excellent += membership.excellent * weight;
    categoryMembership[indicator.category].good += membership.good * weight;
    categoryMembership[indicator.category].average += membership.average * weight;
    categoryMembership[indicator.category].poor += membership.poor * weight;
    categoryWeights[indicator.category] += weight;
    indicatorScores[indicator.id] = scoreMembership(membership);
  }

  if (totalWeight <= 0) {
    return {
      propertyId: property.id,
      eliminated: false,
      hardFailReasons: [],
      totalScore: 0,
      dominantGrade: "poor",
      membership: { ...EMPTY_MEMBERSHIP },
      categoryScores: {},
      indicatorScores
    };
  }

  const membership = normalizeMembership(totals);
  const categoryScores = Object.fromEntries(
    Object.entries(categoryMembership).map(([category, vector]) => [category, scoreMembership(normalizeMembership(vector))])
  );

  return {
    propertyId: property.id,
    eliminated: false,
    hardFailReasons: [],
    totalScore: Math.round(scoreMembership(membership) * 10) / 10,
    dominantGrade: dominantGrade(membership),
    membership,
    categoryScores,
    indicatorScores
  };
}
