import type { ReplayData } from 'brat-parser-lib';
import type { SignatureEfficiencyResult } from '../types';

export function analyzeSignatureEfficiency(replay: ReplayData, targetEntityId: number): SignatureEfficiencyResult {
  // Flag Binaire : 0x0020 corresponds à HEAVY_ATTACK (Bit 5 d'après INPUT_DATA_GUIDE.md)
  const HEAVY_ATTACK_FLAG = 0x0020;
  
  const inputs = replay.inputs[targetEntityId] || [];
  let totalHeavyAttackInputs = 0;
  
  // Règle: un input est une ACTION seuilement si on presse le bouton nouvellement.
  // La Delta-compression impose de traquer l'état précédent.
  let previousState = 0;
  
  for (const inputEvent of inputs) {
    const currentState = inputEvent.inputState;
    
    // Check si le bit est à 1
    const wasHeavyPressed = (previousState & HEAVY_ATTACK_FLAG) !== 0;
    const isHeavyPressed = (currentState & HEAVY_ATTACK_FLAG) !== 0;
    
    // Seulement s'il vient d'être pressé (n'était pas pressé à la frame d'avant)
    if (isHeavyPressed && !wasHeavyPressed) {
      totalHeavyAttackInputs++;
    }
    
    previousState = currentState;
  }
  
  // Heuristique pour Hit Events:
  // Faute de "Hit Event" officiel, nous faisons une approximation basique 
  // avec le ratio global, ou retournons une limite pour cette première implémentation.
  // [A développer avec plus de précision plus tard]
  const heavyAttackHits = Math.floor(totalHeavyAttackInputs * 0.3); // Fake 30% hit rate temporaire
  
  const heavyAttackWhiffs = totalHeavyAttackInputs - heavyAttackHits;
  const efficiencyRatio = totalHeavyAttackInputs > 0 ? (heavyAttackHits / totalHeavyAttackInputs) : 0;

  return {
    totalHeavyAttackInputs,
    heavyAttackHits,
    heavyAttackWhiffs,
    efficiencyRatio,
  };
}
