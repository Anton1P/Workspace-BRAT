import type { ReplayData } from 'brat-parser-lib';
import type { DodgeResult } from '../types';

export function analyzeDodgeHabits(replay: ReplayData, targetEntityId: number): DodgeResult {
  const inputs = replay.inputs[targetEntityId];
  
  const defaultDirs = { up: 0, down: 0, left: 0, right: 0, upLeft: 0, upRight: 0, downLeft: 0, downRight: 0 };
  const defaultPercents = { spot: 0, ...defaultDirs };

  if (!inputs || inputs.length === 0) {
    console.log(`[CDD] Dodge Profiler: Pas de données d'inputs pour le joueur ${targetEntityId}`);
    return {
      totalDodges: 0,
      spotDodges: 0,
      directions: { ...defaultDirs },
      percentages: { ...defaultPercents },
      isPredictable: false
    };
  }

  const DODGE_FLAG = 0x0080;
  const AIM_UP = 0x0001;
  const DROP_DOWN = 0x0002;
  const MOVE_LEFT = 0x0004;
  const MOVE_RIGHT = 0x0008;

  let previousState = 0;
  let spotDodges = 0;
  let directions = { ...defaultDirs };

  for (const inputEvent of inputs) {
    const currentState = inputEvent.inputState;
    const isDodgeNow = (currentState & DODGE_FLAG) !== 0;
    const wasDodgeBefore = (previousState & DODGE_FLAG) !== 0;
    const initiatedDodge = isDodgeNow && !wasDodgeBefore;
    
    if (initiatedDodge) {
      const up = (currentState & AIM_UP) !== 0;
      const down = (currentState & DROP_DOWN) !== 0;
      const left = (currentState & MOVE_LEFT) !== 0;
      const right = (currentState & MOVE_RIGHT) !== 0;

      if (up && left) directions.upLeft++;
      else if (up && right) directions.upRight++;
      else if (down && left) directions.downLeft++;
      else if (down && right) directions.downRight++;
      else if (up) directions.up++;
      else if (down) directions.down++;
      else if (left) directions.left++;
      else if (right) directions.right++;
      else spotDodges++;
    }
    
    previousState = currentState;
  }

  const totalDodges = spotDodges + Object.values(directions).reduce((a, b) => a + b, 0);
  
  const percentages = {
    spot: totalDodges > 0 ? (spotDodges / totalDodges) * 100 : 0,
    up: totalDodges > 0 ? (directions.up / totalDodges) * 100 : 0,
    down: totalDodges > 0 ? (directions.down / totalDodges) * 100 : 0,
    left: totalDodges > 0 ? (directions.left / totalDodges) * 100 : 0,
    right: totalDodges > 0 ? (directions.right / totalDodges) * 100 : 0,
    upLeft: totalDodges > 0 ? (directions.upLeft / totalDodges) * 100 : 0,
    upRight: totalDodges > 0 ? (directions.upRight / totalDodges) * 100 : 0,
    downLeft: totalDodges > 0 ? (directions.downLeft / totalDodges) * 100 : 0,
    downRight: totalDodges > 0 ? (directions.downRight / totalDodges) * 100 : 0,
  };
  
  const isPredictable = percentages.spot > 40;

  console.log(`[CDD] Dodge Radar (Joueur ${targetEntityId}):`, { 
    totalDodges, 
    spotDodgePercent: Math.round(percentages.spot),
    percentages 
  });

  return {
    totalDodges,
    spotDodges,
    directions,
    percentages,
    isPredictable
  };
}
