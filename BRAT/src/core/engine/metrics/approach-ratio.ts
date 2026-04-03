import type { ReplayData } from 'brat-parser-lib';
import type { ApproachRatioResult } from '../types';

export function analyzeApproachRatio(replay: ReplayData, targetEntityId: number): ApproachRatioResult {
  const inputs = replay.inputs[targetEntityId] || [];
  
  // Constantes de masques binaires (d'après InputFlags)
  const JUMP_FLAG = 0x0010;
  const DROP_FLAG = 0x0002;
  const DODGE_DASH_FLAG = 0x0100;
  const LIGHT_ATTACK_FLAG = 0x0080;
  const HEAVY_ATTACK_FLAG = 0x0040; // Note: In user doc 0x0020 is priority_neutral... wait, user doc actually says:
  // Let's check: 0x0080 LIGHT, 0x0040 HEAVY.

  let aerialApproaches = 0;
  let groundedApproaches = 0;
  
  let previousState = 0;
  let wasInAir = false;

  for (const inputEvent of inputs) {
    const currentState = inputEvent.inputState;

    // Détection basique pour savoir s'il est au sol ou en l'air.
    // L'heuristique parfaite serait de traquer les landing frames, mais on gère en statique:
    // S'il saute ou drop, il est en l'air. S'il dash (DODGE_DASH), c'est une action majoritairement au sol.
    if ((currentState & JUMP_FLAG) || (currentState & DROP_FLAG)) {
      wasInAir = true;
    }
    // Une approximation pour dire "il est retombé car il dash":
    if ((currentState & DODGE_DASH_FLAG) && !(currentState & JUMP_FLAG)) {
       wasInAir = false;
    }

    // Est-ce une nouvelle attaque initiée ?
    const isAttackNow = (currentState & LIGHT_ATTACK_FLAG) || (currentState & HEAVY_ATTACK_FLAG);
    const wasAttackBefore = (previousState & LIGHT_ATTACK_FLAG) || (previousState & HEAVY_ATTACK_FLAG);

    if (isAttackNow && !wasAttackBefore) {
      // C'est une approche (initiation d'attaque)
      // La règle de l'utilisateur: "C'est une approche 'Aerial' si le bitmask contient JUMP, DROP ou si l'attaque précédente était aérienne et qu'il n'a pas retouché le sol."
      // "C'est une approche 'Grounded' si le bitmask contient DODGE_DASH ou aucune touche aérienne."
      const hasAerialKeysCurrent = (currentState & JUMP_FLAG) || (currentState & DROP_FLAG);
      const hasDashCurrent = (currentState & DODGE_DASH_FLAG);
      
      if (hasAerialKeysCurrent || (wasInAir && !hasDashCurrent)) {
         aerialApproaches++;
         wasInAir = true; // Confirme qu'on a attaqué en l'air
      } else {
         groundedApproaches++;
         wasInAir = false;
      }
    }

    previousState = currentState;
  }

  const totalApproaches = groundedApproaches + aerialApproaches;
  
  let groundedPercentage = 0;
  let aerialPercentage = 0;

  if (totalApproaches > 0) {
    groundedPercentage = (groundedApproaches / totalApproaches) * 100;
    aerialPercentage = (aerialApproaches / totalApproaches) * 100;
  }

  return {
    groundedApproaches,
    aerialApproaches,
    totalApproaches,
    groundedPercentage,
    aerialPercentage
  };
}
