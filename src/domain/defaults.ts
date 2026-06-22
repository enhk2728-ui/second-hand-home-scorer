import type { AppState, EvaluationGrade, Indicator, PropertyRecord } from "./types";

export const EVALUATION_GRADES: EvaluationGrade[] = [
  { key: "excellent", label: "优秀", score: 100 },
  { key: "good", label: "良好", score: 80 },
  { key: "average", label: "一般", score: 60 },
  { key: "poor", label: "较差", score: 30 }
];

export const DEFAULT_INDICATORS: Indicator[] = [
  // ---- 位置通勤 ----
  {
    id: "commute_minutes",
    name: "通勤时间",
    category: "位置通勤",
    inputType: "number",
    direction: "lowerBetter",
    subjectiveWeight: 1,
    objectiveWeight: 0,
    finalWeight: 1,
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
    id: "transit_score",
    name: "地铁/公交便利",
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
  },
  {
    id: "living_convenience",
    name: "周边生活便利",
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
  },
  {
    id: "school_district",
    name: "学区/教育匹配",
    category: "位置通勤",
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
        { value: "excellent", label: "优秀学区", membership: { excellent: 1, good: 0, average: 0, poor: 0 } },
        { value: "good", label: "较好匹配", membership: { excellent: 0, good: 1, average: 0, poor: 0 } },
        { value: "average", label: "一般/无需求", membership: { excellent: 0, good: 0, average: 1, poor: 0 } },
        { value: "poor", label: "不匹配", membership: { excellent: 0, good: 0, average: 0, poor: 1 } }
      ]
    }
  },

  // ---- 价格价值 ----
  {
    id: "total_price_pressure",
    name: "总价压力",
    category: "价格价值",
    inputType: "number",
    direction: "lowerBetter",
    subjectiveWeight: 1,
    objectiveWeight: 0,
    finalWeight: 1,
    objectiveWeightEnabled: false,
    objectiveWeightMethod: "entropy",
    participatesInScoring: true,
    participatesInObjectiveWeight: true,
    isHardFailCapable: false,
    fceRule: {
      type: "numericThreshold",
      bands: [
        { max: 300, membership: { excellent: 1, good: 0, average: 0, poor: 0 } },
        { max: 500, membership: { excellent: 0.2, good: 0.8, average: 0, poor: 0 } },
        { max: 700, membership: { excellent: 0, good: 0.2, average: 0.8, poor: 0 } },
        { min: 700, membership: { excellent: 0, good: 0, average: 0.2, poor: 0.8 } }
      ]
    }
  },
  {
    id: "unit_price_reason",
    name: "单价合理性",
    category: "价格价值",
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
  },
  {
    id: "bargain_room",
    name: "议价空间",
    category: "价格价值",
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
  },
  {
    id: "future_liquidity",
    name: "未来流动性",
    category: "价格价值",
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
  },

  // ---- 房屋本体 ----
  {
    id: "layout_score",
    name: "户型满意度",
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
  },
  {
    id: "light_ventilation",
    name: "采光通风",
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
  },
  {
    id: "floor_elevator",
    name: "楼层/电梯",
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
        { value: "excellent", label: "理想楼层，有电梯", membership: { excellent: 1, good: 0, average: 0, poor: 0 } },
        { value: "good", label: "可接受", membership: { excellent: 0, good: 1, average: 0, poor: 0 } },
        { value: "average", label: "一般/无电梯低层", membership: { excellent: 0, good: 0, average: 1, poor: 0 } },
        { value: "poor", label: "顶楼/底层/无电梯高层", membership: { excellent: 0, good: 0, average: 0, poor: 1 } }
      ]
    }
  },
  {
    id: "renovation_cost",
    name: "装修维护成本",
    category: "房屋本体",
    inputType: "number",
    direction: "lowerBetter",
    subjectiveWeight: 1,
    objectiveWeight: 0,
    finalWeight: 1,
    objectiveWeightEnabled: false,
    objectiveWeightMethod: "entropy",
    participatesInScoring: true,
    participatesInObjectiveWeight: true,
    isHardFailCapable: false,
    fceRule: {
      type: "numericThreshold",
      bands: [
        { max: 5, membership: { excellent: 1, good: 0, average: 0, poor: 0 } },
        { max: 10, membership: { excellent: 0.2, good: 0.8, average: 0, poor: 0 } },
        { max: 20, membership: { excellent: 0, good: 0.2, average: 0.8, poor: 0 } },
        { min: 20, membership: { excellent: 0, good: 0, average: 0.2, poor: 0.8 } }
      ]
    }
  },
  {
    id: "noise_level",
    name: "噪音影响",
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
  },

  // ---- 小区物业 ----
  {
    id: "community_quality",
    name: "小区品质",
    category: "小区物业",
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
  },
  {
    id: "property_service",
    name: "物业服务",
    category: "小区物业",
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
  },
  {
    id: "parking_score",
    name: "停车便利",
    category: "小区物业",
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
  },
  {
    id: "environment_safety",
    name: "环境与安全",
    category: "小区物业",
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
  },

  // ---- 风险流动性 ----
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
  },
  {
    id: "structure_risk",
    name: "房屋结构/漏水硬伤",
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
  },
  {
    id: "lien_risk",
    name: "抵押查封风险",
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
  },
  {
    id: "tax_cycle_risk",
    name: "税费/交易周期压力",
    category: "风险流动性",
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
        { value: "excellent", label: "满五唯一/税费低", membership: { excellent: 1, good: 0, average: 0, poor: 0 } },
        { value: "good", label: "税费可接受", membership: { excellent: 0, good: 1, average: 0, poor: 0 } },
        { value: "average", label: "税费偏高", membership: { excellent: 0, good: 0, average: 1, poor: 0 } },
        { value: "poor", label: "税费很高/周期长", membership: { excellent: 0, good: 0, average: 0, poor: 1 } }
      ]
    }
  }
];

const now = "2026-06-19T00:00:00.000Z";

export const SAMPLE_PROPERTIES: PropertyRecord[] = [
  {
    id: "sample-a",
    name: "A 房源",
    community: "梧桐里",
    address: "通勤便利，户型方正",
    link: "",
    totalPrice: 520,
    area: 89,
    unitPrice: 58426.97,
    notes: "通勤稳定，户型较好，小区物业不错。",
    valuesByIndicatorId: {
      commute_minutes: 32,
      transit_score: 8,
      living_convenience: 7,
      school_district: "good",
      total_price_pressure: 520,
      unit_price_reason: 7,
      bargain_room: 5,
      future_liquidity: 8,
      layout_score: 8,
      light_ventilation: 9,
      floor_elevator: "excellent",
      renovation_cost: 8,
      noise_level: 7,
      community_quality: 7,
      property_service: 7,
      parking_score: 6,
      environment_safety: 8,
      title_risk: false,
      structure_risk: false,
      lien_risk: false,
      tax_cycle_risk: "good",
    },
    hardFails: [],
    createdAt: now,
    updatedAt: now
  },
  {
    id: "sample-b",
    name: "B 房源",
    community: "滨河花园",
    address: "价格实惠，小区一般",
    link: "",
    totalPrice: 480,
    area: 82,
    unitPrice: 58536.59,
    notes: "价格不错，小区一般，通勤较远。",
    valuesByIndicatorId: {
      commute_minutes: 48,
      transit_score: 6,
      living_convenience: 5,
      school_district: "average",
      total_price_pressure: 480,
      unit_price_reason: 8,
      bargain_room: 8,
      future_liquidity: 6,
      layout_score: 6,
      light_ventilation: 7,
      floor_elevator: "good",
      renovation_cost: 12,
      noise_level: 5,
      community_quality: 6,
      property_service: 5,
      parking_score: 4,
      environment_safety: 6,
      title_risk: false,
      structure_risk: false,
      lien_risk: false,
      tax_cycle_risk: "excellent",
    },
    hardFails: [],
    createdAt: now,
    updatedAt: now
  },
  {
    id: "sample-c",
    name: "C 房源",
    community: "老城公寓",
    address: "有硬伤风险",
    link: "",
    totalPrice: 430,
    area: 76,
    unitPrice: 56578.95,
    notes: "存在产权交易风险与结构隐患，进入淘汰列表。",
    valuesByIndicatorId: {
      commute_minutes: 28,
      transit_score: 9,
      living_convenience: 9,
      school_district: "excellent",
      total_price_pressure: 430,
      unit_price_reason: 9,
      bargain_room: 7,
      future_liquidity: 4,
      layout_score: 7,
      light_ventilation: 6,
      floor_elevator: "average",
      renovation_cost: 18,
      noise_level: 4,
      community_quality: 5,
      property_service: 4,
      parking_score: 3,
      environment_safety: 5,
      title_risk: false,
      structure_risk: true,
      lien_risk: false,
      tax_cycle_risk: "average",
    },
    hardFails: ["房屋结构/漏水硬伤"],
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
      ahpGenerationMode: "equal",
      rankedOrderIds: [],
    }
  ],
  activeProfileId: "default-fce",
  selectedPropertyId: "sample-a"
};
