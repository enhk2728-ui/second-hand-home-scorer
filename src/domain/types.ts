export type GradeKey = "excellent" | "good" | "average" | "poor";

export type IndicatorInputType = "number" | "rating10" | "select" | "boolean";
export type IndicatorDirection = "higherBetter" | "lowerBetter" | "rangeBest" | "mapping";

export type MembershipVector = Record<GradeKey, number>;

export interface EvaluationGrade {
  key: GradeKey;
  label: string;
  score: number;
}

export interface NumericBand {
  max?: number;
  min?: number;
  membership: MembershipVector;
}

export interface FceRule {
  type: "numericThreshold" | "rating10" | "selectMapping" | "booleanMapping";
  bands?: NumericBand[];
  options?: Array<{ value: string; label: string; membership: MembershipVector }>;
  booleanMap?: { true: MembershipVector; false: MembershipVector };
}

export interface Indicator {
  id: string;
  name: string;
  category: string;
  inputType: IndicatorInputType;
  direction: IndicatorDirection;
  subjectiveWeight: number;
  objectiveWeight: number;
  finalWeight: number;
  objectiveWeightEnabled: boolean;
  objectiveWeightMethod: "entropy";
  fceRule: FceRule;
  isHardFailCapable: boolean;
  participatesInScoring: boolean;
  participatesInObjectiveWeight: boolean;
}

export interface PropertyRecord {
  id: string;
  name: string;
  community: string;
  address: string;
  link: string;
  totalPrice: number | "";
  area: number | "";
  unitPrice: number | "";
  notes: string;
  valuesByIndicatorId: Record<string, string | number | boolean | "">;
  hardFails: string[];
  createdAt: string;
  updatedAt: string;
}

export type AhpComparisonMap = Record<string, Record<string, number>>;

export interface ScoringProfile {
  id: string;
  name: string;
  algorithm: "fce";
  objectiveWeightEnabled: boolean;
  objectiveWeightMethod: "entropy";
  subjectiveBlend: number;
  ahpComparisons?: AhpComparisonMap;
}

export interface PropertyScore {
  propertyId: string;
  eliminated: boolean;
  hardFailReasons: string[];
  totalScore: number;
  dominantGrade: GradeKey;
  membership: MembershipVector;
  categoryScores: Record<string, number>;
  indicatorScores: Record<string, number>;
}

export interface AppState {
  indicators: Indicator[];
  properties: PropertyRecord[];
  scoringProfiles: ScoringProfile[];
  activeProfileId: string;
  selectedPropertyId: string | null;
}
