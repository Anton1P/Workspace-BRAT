import type { ReplayData } from 'brat-parser-lib';
import type { IntensityResult, IntensityBucket } from '../types';

export function analyzeIntensity(replay: ReplayData): IntensityResult {
  const INTERVAL_MS = 10000; // 10 seconds buckets
  // On sécurise si `length` n'existe pas ou vaut 0
  const matchLength = replay.length || 0;
  
  if (matchLength === 0) {
    console.log("[CDD] Intensity Graph: Pas de length trouvée pour le replay");
    return { buckets: [], maxAPM: 0, intervalMs: INTERVAL_MS };
  }

  const numBuckets = Math.ceil(matchLength / INTERVAL_MS);
  
  // Initialisation à vide pour chaque bucket
  const buckets: IntensityBucket[] = Array.from({ length: numBuckets }, (_, i) => ({
    timeMs: i * INTERVAL_MS,
    apms: {}
  }));

  let maxAPM = 0;

  for (const entity of replay.entities) {
    const inputs = replay.inputs[entity.id] || [];
    let previousState = 0;
    
    const actionsPerBucket = new Array(numBuckets).fill(0);

    for (const inputEvent of inputs) {
      const currentState = inputEvent.inputState;
      const ts = inputEvent.timestamp;

      // On compte les actions, comme dans l'APM général : 
      // Différence stricte, en ignorant quand on relâche tout.
      if (currentState !== previousState && currentState !== 0) {
        const bucketIndex = Math.floor(ts / INTERVAL_MS);
        if (bucketIndex >= 0 && bucketIndex < numBuckets) {
          actionsPerBucket[bucketIndex]++;
        }
      }
      previousState = currentState;
    }

    // Convertir les actions en APM (x6) pour l'intervalle donné
    for (let i = 0; i < numBuckets; i++) {
      const bucketAPM = actionsPerBucket[i] * 6; // 10 sec en minute
      buckets[i].apms[entity.id] = bucketAPM;
      if (bucketAPM > maxAPM) {
        maxAPM = bucketAPM;
      }
    }
  }

  // Console Driven Development feedback
  console.log("[CDD] Intensity Graph:", { 
    totalBuckets: numBuckets, 
    maxAPM, 
    sampleBucket: buckets.length > 0 ? buckets[0] : null
  });

  return {
    buckets,
    maxAPM,
    intervalMs: INTERVAL_MS
  };
}