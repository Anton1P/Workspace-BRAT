import type { ReplayData } from 'brat-parser-lib';
import type { Tier1AnalysisResult } from './types';
import { analyzeSignatureEfficiency } from './metrics/signature-efficiency';
import { analyzeAPM } from './metrics/apm';
import { analyzeApproachRatio } from './metrics/approach-ratio';
import { analyzeCombo } from './metrics/combo-tracker';
import { analyzeDodgeHabits } from './metrics/dodge-profiler';
import { analyzeIntensity } from './metrics/intensity-tracker';

export function analyzeTier1(replay: ReplayData, targetEntityId: number): Tier1AnalysisResult {
  return {
    signatureEfficiency: analyzeSignatureEfficiency(replay, targetEntityId),
    apm: analyzeAPM(replay, targetEntityId),
    approachRatio: analyzeApproachRatio(replay, targetEntityId),
    combo: analyzeCombo(replay, targetEntityId),
    dodge: analyzeDodgeHabits(replay, targetEntityId),
    intensity: analyzeIntensity(replay)
  };
}
