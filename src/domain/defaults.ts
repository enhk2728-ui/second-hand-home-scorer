import type { AppState, EvaluationGrade, Indicator, PropertyRecord } from "./types";

export const EVALUATION_GRADES: EvaluationGrade[] = [
  { key: "excellent", label: "优秀", score: 100 },
  { key: "good", label: "良好", score: 80 },
  { key: "average", label: "一般", score: 60 },
  { key: "poor", label: "较差", score: 30 }
];

export const DEFAULT_INDICATORS: Indicator[] = [
  {
    id: "commute_minutes",
    name: "通勤时间",
    category: "位置通勤",
    inputType: "number",
    direction: "lowerBetter",
    subjectiveWeight: 2,
    objectiveWeight: 0,
    finalWeight: 2,
    objectiveWeightEnabled: false,
    objectiveWeightMethod: "entropy",
    participatesInScoring: true,
    participatesInObjectiveWeight: true,
    isHardFailCapable: false,
    fceRule: {
      type: "numericThreshold",
      bands: [
        { max: 25, membership: { excellent: 1, good: 0, average: 0, poor: 0 } },
        { max: 40, membership: { excellent: 0.2, good: 0.8, average: 0, poor: 0 } },
        { max: 60, membership: { excellent: 0, good: 0.2, average: 0.8, poor: 0 } },
        { min: 60, membership: { excellent: 0, good: 0, average: 0.2, poor: 0.8 } }
      ]
    }
  },
  {
    id: "price_value",
    name: "价格性价比",
    category: "价格价值",
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
    fceRule: { type: "rating10" }
  },
  {
    id: "layout_score",
    name: "户型满意度",
    category: "房屋本体",
    inputType: "rating10",
    direction: "higherBetter",
    subjectiveWeight: 1.5,
    objectiveWeight: 0,
    finalWeight: 1.5,
    objectiveWeightEnabled: false,
    objectiveWeightMethod: "entropy",
    participatesInScoring: true,
    participatesInObjectiveWeight: true,
    isHardFailCapable: false,
    fceRule: { type: "rating10" }
  },
  {
    id: "community_quality",
    name: "小区品质",
    category: "小区物业",
    inputType: "rating10",
    direction: "higherBetter",
    subjectiveWeight: 1.5,
    objectiveWeight: 0,
    finalWeight: 1.5,
    objectiveWeightEnabled: false,
    objectiveWeightMethod: "entropy",
    participatesInScoring: true,
    participatesInObjectiveWeight: true,
    isHardFailCapable: false,
    fceRule: { type: "rating10" }
  },
  {
    id: "title_risk",
    name: "产权/交易硬伤",
    category: "风险流动性",
    inputType: "boolean",
    direction: "mapping",
    subjectiveWeight: 0,
    objectiveWeight: 0,
    finalWeight: 0,
    objectiveWeightEnabled: false,
    objectiveWeightMethod: "entropy",
    participatesInScoring: false,
    participatesInObjectiveWeight: false,
    isHardFailCapable: true,
    fceRule: {
      type: "booleanMapping",
      booleanMap: {
        true: { excellent: 1, good: 0, average: 0, poor: 0 },
        false: { excellent: 0, good: 0, average: 0, poor: 0 }
      }
    }
  }
];

const now = "2026-06-19T00:00:00.000Z";

export const SAMPLE_PROPERTIES: PropertyRecord[] = [
  {
    id: "sample-a",
    name: "A 房源",
    community: "梧桐里",
    address: "示例地址 1",
    link: "",
    totalPrice: 520,
    area: 89,
    unitPrice: 5.84,
    notes: "通勤稳定，户型较好。",
    valuesByIndicatorId: {
      commute_minutes: 32,
      price_value: 8,
      layout_score: 8,
      community_quality: 7,
      title_risk: false
    },
    hardFails: [],
    createdAt: now,
    updatedAt: now
  },
  {
    id: "sample-b",
    name: "B 房源",
    community: "滨河花园",
    address: "示例地址 2",
    link: "",
    totalPrice: 480,
    area: 82,
    unitPrice: 5.85,
    notes: "价格不错，小区一般。",
    valuesByIndicatorId: {
      commute_minutes: 48,
      price_value: 9,
      layout_score: 6,
      community_quality: 6,
      title_risk: false
    },
    hardFails: [],
    createdAt: now,
    updatedAt: now
  },
  {
    id: "sample-c",
    name: "C 房源",
    community: "老城公寓",
    address: "示例地址 3",
    link: "",
    totalPrice: 430,
    area: 76,
    unitPrice: 5.66,
    notes: "存在交易风险，进入淘汰列表。",
    valuesByIndicatorId: {
      commute_minutes: 28,
      price_value: 7,
      layout_score: 7,
      community_quality: 5,
      title_risk: true
    },
    hardFails: ["产权/交易硬伤"],
    createdAt: now,
    updatedAt: now
  }
];

export const DEFAULT_STATE: AppState = {
  indicators: DEFAULT_INDICATORS,
  properties: SAMPLE_PROPERTIES,
  scoringProfiles: [
    {
      id: "default-fce",
      name: "默认 FCE 方案",
      algorithm: "fce",
      objectiveWeightEnabled: false,
      objectiveWeightMethod: "entropy",
      subjectiveBlend: 1,
      ahpComparisons: {},
    }
  ],
  activeProfileId: "default-fce",
  selectedPropertyId: "sample-a"
};
