import { describe, expect, it } from "vitest";
import { calculatePropertyScore, effectiveValueForScoring, indicatorDisplayScore, membershipFromRule, normalizeMembership } from "./fce";
import type { Indicator, PropertyRecord } from "./types";

const baseIndicator: Indicator = {
  id: "commute",
  name: "通勤时间",
  category: "位置通勤",
  inputType: "number",
  direction: "lowerBetter",
  subjectiveWeight: 2,
  objectiveWeight: 0,
  finalWeight: 2,
  objectiveWeightEnabled: false,
  objectiveWeightMethod: "entropy",
  participatesInObjectiveWeight: true,
  participatesInScoring: true,
  isHardFailCapable: false,
  fceRule: {
    type: "numericThreshold",
    bands: [
      { max: 20, membership: { excellent: 1, good: 0, average: 0, poor: 0 } },
      { max: 40, membership: { excellent: 0.2, good: 0.8, average: 0, poor: 0 } },
      { max: 60, membership: { excellent: 0, good: 0.2, average: 0.8, poor: 0 } },
      { min: 60, membership: { excellent: 0, good: 0, average: 0.2, poor: 0.8 } }
    ]
  }
};

const property: PropertyRecord = {
  id: "p1",
  name: "样例房源",
  community: "样例小区",
  address: "",
  link: "",
  totalPrice: 500,
  area: 89,
  unitPrice: 5.62,
  notes: "",
  valuesByIndicatorId: { commute: 35 },
  hardFails: [],
  createdAt: "2026-06-19T00:00:00.000Z",
  updatedAt: "2026-06-19T00:00:00.000Z"
};

describe("FCE scoring", () => {
  it("normalizes membership vectors", () => {
    expect(normalizeMembership({ excellent: 2, good: 1, average: 1, poor: 0 })).toEqual({
      excellent: 0.5,
      good: 0.25,
      average: 0.25,
      poor: 0
    });
  });

  it("maps numeric threshold values to membership", () => {
    expect(membershipFromRule(baseIndicator, 35)).toEqual({
      excellent: 0.2,
      good: 0.8,
      average: 0,
      poor: 0
    });
  });

  it("scores a non-eliminated property", () => {
    const score = calculatePropertyScore(property, [baseIndicator]);
    expect(score.eliminated).toBe(false);
    expect(score.totalScore).toBeCloseTo(84);
    expect(score.dominantGrade).toBe("good");
  });

  it("eliminates properties with hard fails", () => {
    const score = calculatePropertyScore({ ...property, hardFails: ["产权风险"] }, [baseIndicator]);
    expect(score.eliminated).toBe(true);
    expect(score.hardFailReasons).toEqual(["产权风险"]);
    expect(score.totalScore).toBe(0);
  });

  it("zero finalWeight indicator contributes no score and does not change total", () => {
    const zeroWeightInd: Indicator = {
      id: "zero_wt",
      name: "不计分指标",
      category: "测试",
      inputType: "rating10",
      direction: "higherBetter",
      subjectiveWeight: 5, // deliberately non-zero to prove finalWeight takes precedence
      objectiveWeight: 0,
      finalWeight: 0, // intentional zero weight
      objectiveWeightEnabled: false,
      objectiveWeightMethod: "entropy",
      participatesInScoring: true,
      participatesInObjectiveWeight: true,
      isHardFailCapable: false,
      fceRule: { type: "rating10" }
    };

    // Score with only the zero-weight indicator
    const scoreWithZero = calculatePropertyScore(
      { ...property, valuesByIndicatorId: { zero_wt: 9 }, hardFails: [] },
      [zeroWeightInd]
    );
    expect(scoreWithZero.totalScore).toBe(0);
    expect(scoreWithZero.dominantGrade).toBe("poor");

    // Score with a real indicator, then add the zero-weight one — totals should be the same
    const scoreWithoutZero = calculatePropertyScore(
      { ...property, valuesByIndicatorId: { commute: 35 }, hardFails: [] },
      [baseIndicator]
    );
    const scoreWithBoth = calculatePropertyScore(
      { ...property, valuesByIndicatorId: { commute: 35, zero_wt: 9 }, hardFails: [] },
      [baseIndicator, zeroWeightInd]
    );
    expect(scoreWithBoth.totalScore).toBe(scoreWithoutZero.totalScore);
  });

  it("false boolean does not lower FCE score", () => {
    const boolInd: Indicator = {
      id: "has_elevator",
      name: "有电梯",
      category: "房屋本体",
      inputType: "boolean",
      direction: "mapping",
      subjectiveWeight: 1,
      objectiveWeight: 0,
      finalWeight: 1,
      objectiveWeightEnabled: false,
      objectiveWeightMethod: "entropy",
      participatesInScoring: true,
      participatesInObjectiveWeight: true,
      isHardFailCapable: false,
      fceRule: {
        type: "booleanMapping",
        booleanMap: {
          true: { excellent: 1, good: 0, average: 0, poor: 0 },
          false: { excellent: 0, good: 0, average: 0, poor: 0 }
        }
      }
    };
    const ratingInd: Indicator = {
      id: "layout",
      name: "户型",
      category: "房屋本体",
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
      fceRule: { type: "rating10" }
    };

    const pWithFalse = {
      ...property,
      valuesByIndicatorId: { layout: 8, has_elevator: false },
      hardFails: []
    };
    const scoreWithFalse = calculatePropertyScore(pWithFalse, [boolInd, ratingInd]);

    const pWithoutBool = {
      ...property,
      valuesByIndicatorId: { layout: 8 },
      hardFails: []
    };
    const scoreWithoutBool = calculatePropertyScore(pWithoutBool, [ratingInd]);

    expect(scoreWithFalse.totalScore).toBe(scoreWithoutBool.totalScore);
    expect(scoreWithFalse.eliminated).toBe(false);
  });
});

describe("effectiveValueForScoring", () => {
  const rating10Ind: Indicator = {
    id: "transit",
    name: "地铁便利",
    category: "位置通勤",
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
    fceRule: { type: "rating10" }
  };

  const selectInd: Indicator = {
    id: "floor",
    name: "楼层",
    category: "房屋本体",
    inputType: "select",
    direction: "mapping",
    subjectiveWeight: 1,
    objectiveWeight: 0,
    finalWeight: 1,
    objectiveWeightEnabled: false,
    objectiveWeightMethod: "entropy",
    participatesInScoring: true,
    participatesInObjectiveWeight: true,
    isHardFailCapable: false,
    fceRule: {
      type: "selectMapping",
      options: [
        { value: "excellent", label: "理想楼层", membership: { excellent: 1, good: 0, average: 0, poor: 0 } },
        { value: "good", label: "可接受", membership: { excellent: 0, good: 1, average: 0, poor: 0 } },
        { value: "average", label: "一般", membership: { excellent: 0, good: 0, average: 1, poor: 0 } },
        { value: "poor", label: "较差", membership: { excellent: 0, good: 0, average: 0, poor: 1 } }
      ]
    }
  };

  const numberInd: Indicator = {
    ...baseIndicator,
    inputType: "number" as const,
  };

  it("rating10 empty string defaults to 5", () => {
    expect(effectiveValueForScoring(rating10Ind, "")).toBe(5);
  });

  it("rating10 with value returns value unchanged", () => {
    expect(effectiveValueForScoring(rating10Ind, 8)).toBe(8);
  });

  it("select empty string stays empty (not defaulted)", () => {
    expect(effectiveValueForScoring(selectInd, "")).toBe("");
  });

  it("number empty string stays empty (not defaulted)", () => {
    expect(effectiveValueForScoring(numberInd, "")).toBe("");
  });
});

describe("rating10 scoring", () => {
  const rating10Ind: Indicator = {
    id: "transit",
    name: "地铁便利",
    category: "位置通勤",
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
    fceRule: { type: "rating10" }
  };

  const selectInd: Indicator = {
    id: "floor",
    name: "楼层",
    category: "房屋本体",
    inputType: "select",
    direction: "mapping",
    subjectiveWeight: 1,
    objectiveWeight: 0,
    finalWeight: 1,
    objectiveWeightEnabled: false,
    objectiveWeightMethod: "entropy",
    participatesInScoring: true,
    participatesInObjectiveWeight: true,
    isHardFailCapable: false,
    fceRule: {
      type: "selectMapping",
      options: [
        { value: "excellent", label: "理想楼层", membership: { excellent: 1, good: 0, average: 0, poor: 0 } },
        { value: "good", label: "可接受", membership: { excellent: 0, good: 1, average: 0, poor: 0 } },
        { value: "average", label: "一般", membership: { excellent: 0, good: 0, average: 1, poor: 0 } },
        { value: "poor", label: "较差", membership: { excellent: 0, good: 0, average: 0, poor: 1 } }
      ]
    }
  };

  it("rating10 missing value → indicatorScores = 50", () => {
    const p: PropertyRecord = {
      ...property,
      valuesByIndicatorId: {},
      hardFails: []
    };
    const score = calculatePropertyScore(p, [rating10Ind]);
    expect(score.indicatorScores[rating10Ind.id]).toBe(50);
    expect(score.eliminated).toBe(false);
  });

  it("rating10 value 8 → indicatorScores = 80", () => {
    const p: PropertyRecord = {
      ...property,
      valuesByIndicatorId: { transit: 8 },
      hardFails: []
    };
    const score = calculatePropertyScore(p, [rating10Ind]);
    expect(score.indicatorScores[rating10Ind.id]).toBe(80);
  });

  it("rating10 missing value contributes to total via weight", () => {
    const p: PropertyRecord = {
      ...property,
      valuesByIndicatorId: {},
      hardFails: []
    };
    const score = calculatePropertyScore(p, [rating10Ind]);
    // rating10 missing → 5 → average membership → 60% weight contributes
    // With single indicator, totalScore = scoreMembership(normalizeMembership(membership)) = scoreMembership(membership)
    // 5 → average (0,0,1,0) → scored as 60
    expect(score.totalScore).toBe(60);
  });

  it("rating10 missing does not cause zero total when other indicators present", () => {
    const mixedIndicators = [rating10Ind, selectInd];
    const p: PropertyRecord = {
      ...property,
      valuesByIndicatorId: { floor: "excellent" },
      hardFails: []
    };
    const score = calculatePropertyScore(p, mixedIndicators);
    // transit missing → 5→ average(60), floor excellent→ excellent(100)
    // average = (60+100)/2 = 80
    expect(score.totalScore).toBeGreaterThan(0);
    expect(score.indicatorScores[rating10Ind.id]).toBe(50);
    expect(score.indicatorScores[selectInd.id]).toBe(100);
  });

  it("rating10 value 1 → indicatorScores = 10, rating10 value 10 → indicatorScores = 100", () => {
    const p1: PropertyRecord = {
      ...property,
      valuesByIndicatorId: { transit: 1 },
      hardFails: []
    };
    expect(calculatePropertyScore(p1, [rating10Ind]).indicatorScores[rating10Ind.id]).toBe(10);

    const p10: PropertyRecord = {
      ...property,
      valuesByIndicatorId: { transit: 10 },
      hardFails: []
    };
    expect(calculatePropertyScore(p10, [rating10Ind]).indicatorScores[rating10Ind.id]).toBe(100);
  });

  it("select missing value still skipped (does not contribute)", () => {
    const p: PropertyRecord = {
      ...property,
      valuesByIndicatorId: { transit: 8 },
      hardFails: []
    };
    const score = calculatePropertyScore(p, [selectInd, rating10Ind]);
    // select is skipped, only transit(8) contributes → 80 score
    // membership from rating10 8→good(0,1,0,0) score=80
    expect(score.indicatorScores[selectInd.id]).toBeUndefined();
    expect(score.totalScore).toBe(80);
  });
});

describe("indicatorDisplayScore", () => {
  it("rating10 score uses value * 10", () => {
    const ind: Indicator = {
      ...baseIndicator,
      inputType: "rating10",
      fceRule: { type: "rating10" }
    };
    expect(indicatorDisplayScore(ind, { excellent: 0, good: 1, average: 0, poor: 0 }, 8)).toBe(80);
    expect(indicatorDisplayScore(ind, { excellent: 0, good: 0, average: 1, poor: 0 }, 5)).toBe(50);
    expect(indicatorDisplayScore(ind, { excellent: 1, good: 0, average: 0, poor: 0 }, 10)).toBe(100);
  });

  it("non-rating10 score delegates to scoreMembership", () => {
    expect(indicatorDisplayScore(baseIndicator, { excellent: 1, good: 0, average: 0, poor: 0 }, 10)).toBe(100);
    expect(indicatorDisplayScore(baseIndicator, { excellent: 0, good: 1, average: 0, poor: 0 }, 30)).toBe(80);
    expect(indicatorDisplayScore(baseIndicator, { excellent: 0, good: 0, average: 1, poor: 0 }, 50)).toBe(60);
    expect(indicatorDisplayScore(baseIndicator, { excellent: 0, good: 0, average: 0, poor: 1 }, 70)).toBe(30);
  });
});
