import React from 'react';
import { Activity } from 'lucide-react';
import styles from '../Dashboard/Dashboard.module.css';

interface APMTrackerProps {
  apm: number;
  category: 'Faible' | 'Moyen' | 'Pro';
}

export function APMTracker({ apm, category }: APMTrackerProps) {
  // Couleur selon le type d'APM
  let colorVar = 'var(--foreground)';
  let bgVar = 'rgba(255,255,255,0.1)';
  
  if (category === 'Pro') {
    colorVar = 'var(--primary)';
    bgVar = 'var(--primary-glow)';
  } else if (category === 'Moyen') {
    colorVar = 'var(--secondary)';
    bgVar = 'rgba(59, 130, 246, 0.2)';
  } else {
    colorVar = 'var(--warning)';
    bgVar = 'rgba(245, 158, 11, 0.2)';
  }

  return (
    <div className={`${styles.metricCard} glass-panel`}>
      <div className={styles.metricHeader}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Activity size={16} /> APM (Action per Minute)
        </h4>
        <div className={styles.qualityBadge} style={{ background: bgVar, color: colorVar }}>
          {category}
        </div>
      </div>
      
      <div className={styles.metricValue}>
        {apm}
      </div>
      <p className={styles.metricSubtitle}>
        Actions réelles par minute (hors inputs relâchés).
      </p>
    </div>
  );
}
