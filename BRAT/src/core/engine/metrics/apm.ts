import type { ReplayData } from 'brat-parser-lib';
import type { APMResult } from '../types';

export function analyzeAPM(replay: ReplayData, targetEntityId: number): APMResult {
  const inputs = replay.inputs[targetEntityId] || [];
  let totalActions = 0;
  let previousState = 0;

  for (const inputEvent of inputs) {
    const currentState = inputEvent.inputState;
    // Règle: Changement d'état unique, et ce n'est pas juste un relâchement complet des touches (currentState !== 0)
    if (currentState !== previousState && currentState !== 0) {
      totalActions++;
    }
    previousState = currentState;
  }

  const matchDurationSeconds = replay.length / 1000;
  const matchDurationMinutes = matchDurationSeconds / 60;

  // Calcul APM sécurisé
  let apm = 0;
  if (matchDurationMinutes > 0) {
    apm = Math.round(totalActions / matchDurationMinutes);
  }

  // Catégorisation
  let category: 'Faible' | 'Moyen' | 'Pro' = 'Faible';
  if (apm >= 350) {
    category = 'Pro';
  } else if (apm >= 200) {
    category = 'Moyen';
  }

  return {
    actionsPerMinute: apm,
    totalActions,
    category
  };
}
