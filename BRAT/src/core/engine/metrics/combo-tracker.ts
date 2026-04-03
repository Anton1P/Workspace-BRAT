import type { ReplayData } from 'brat-parser-lib';
import type { ComboResult } from '../types';

export function analyzeCombo(replay: ReplayData, targetEntityId: number): ComboResult {
  const inputs = replay.inputs[targetEntityId];
  
  if (!inputs || inputs.length === 0) {
    console.log(`[CDD] analyzeCombo: Pas de données d'inputs pour le joueur ${targetEntityId}`);
    return { maxCombo: 0, totalLight: 0, totalHeavy: 0, lightRatio: 0, heavyRatio: 0, aggressivityLabel: 'Équilibré' };
  }

  // Bitmasks corrigés selon le RESEARCH:
  // Bit 5 (0x0020) = HEAVY_ATTACK
  // Bit 6 (0x0040) = LIGHT_ATTACK
  const LIGHT_ATTACK_FLAG = 0x0040;
  const HEAVY_ATTACK_FLAG = 0x0020;
  
  let previousState = 0;
  let maxComboLength = 0;
  let currentComboLength = 0;
  let lastAttackTimestamp = -1;
  let totalLight = 0;
  let totalHeavy = 0;
  
  for (const inputEvent of inputs) {
    const currentState = inputEvent.inputState;
    const ts = inputEvent.timestamp;
    
    const isLightNow = (currentState & LIGHT_ATTACK_FLAG) !== 0;
    const isHeavyNow = (currentState & HEAVY_ATTACK_FLAG) !== 0;
    const wasLightBefore = (previousState & LIGHT_ATTACK_FLAG) !== 0;
    const wasHeavyBefore = (previousState & HEAVY_ATTACK_FLAG) !== 0;
    
    // On ne compte que la frame précise où l'attaque est déclenchée
    const initiatedLight = isLightNow && !wasLightBefore;
    const initiatedHeavy = isHeavyNow && !wasHeavyBefore;
    
    if (initiatedLight || initiatedHeavy) {
      if (initiatedLight) totalLight++;
      if (initiatedHeavy) totalHeavy++;
      
      // Tolérance élargie à 1200ms pour traquer les "Strings" complètes (avec reads d'esquives/sauts)
      if (lastAttackTimestamp !== -1 && (ts - lastAttackTimestamp) <= 1200) {
        currentComboLength++;
      } else {
        // Nouvelle séquence (1 attaque)
        currentComboLength = 1;
      }
      
      if (currentComboLength > maxComboLength) {
        maxComboLength = currentComboLength;
      }
      
      lastAttackTimestamp = ts;
    }
    
    previousState = currentState;
  }
  
  const totalAttacks = totalLight + totalHeavy;
  const lightRatio = totalAttacks > 0 ? (totalLight / totalAttacks) * 100 : 0;
  const heavyRatio = totalAttacks > 0 ? (totalHeavy / totalAttacks) * 100 : 0;
  
  let aggressivityLabel: 'Agresseur' | 'Punisseur' | 'Équilibré' = 'Équilibré';
  if (lightRatio > 65) {
      aggressivityLabel = 'Agresseur';
  } else if (heavyRatio > 50) {
      aggressivityLabel = 'Punisseur';
  }

  console.log(`[CDD] Combo Tracker Output (Joueur ${targetEntityId}):`, { 
    maxString: maxComboLength, 
    ratio: { light: lightRatio, heavy: heavyRatio },
    totalAttacks
  });

  return {
    maxCombo: maxComboLength,
    totalLight,
    totalHeavy,
    lightRatio,
    heavyRatio,
    aggressivityLabel
  };
}
