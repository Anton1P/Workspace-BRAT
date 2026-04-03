export interface APMResult {
  actionsPerMinute: number;
  totalActions: number;
  category: 'Faible' | 'Moyen' | 'Pro';
}

export interface ApproachRatioResult {
  groundedApproaches: number;
  aerialApproaches: number;
  totalApproaches: number;
  groundedPercentage: number;
  aerialPercentage: number;
}

export interface ComboResult {
  maxCombo: number;
  totalLight: number;
  totalHeavy: number;
  lightRatio: number;
  heavyRatio: number;
  aggressivityLabel: 'Agresseur' | 'Punisseur' | 'Équilibré';
}

export interface DodgeResult {
  totalDodges: number;
  spotDodges: number;
  directions: {
    up: number;
    down: number;
    left: number;
    right: number;
    upLeft: number;
    upRight: number;
    downLeft: number;
    downRight: number;
  };
  percentages: {
    spot: number;
    up: number;
    down: number;
    left: number;
    right: number;
    upLeft: number;
    upRight: number;
    downLeft: number;
    downRight: number;
  };
  isPredictable: boolean;
}

export interface IntensityBucket {
  timeMs: number;
  apms: Record<number, number>; // Record of entityId -> APM in this 10s bucket
}

export interface IntensityResult {
  buckets: IntensityBucket[];
  maxAPM: number;
  intervalMs: number; // 10000 by default
}

export interface SignatureEfficiencyResult {
  totalHeavyAttackInputs: number;
  heavyAttackHits: number;
  heavyAttackWhiffs: number;
  efficiencyRatio: number; // 0 to 1
}

export interface Tier1AnalysisResult {
  signatureEfficiency: SignatureEfficiencyResult;
  apm: APMResult;
  approachRatio: ApproachRatioResult;
  combo: ComboResult;
  dodge: DodgeResult;
  intensity: IntensityResult;
}
