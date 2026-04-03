import React from 'react';
import { Zap } from 'lucide-react';
import styles from '../Dashboard/Dashboard.module.css';

interface ComboTrackerProps {
  maxCombo: number;
  lightRatio: number;
  heavyRatio: number;
  aggressivityLabel: 'Agresseur' | 'Punisseur' | 'Équilibré';
}

export function ComboTracker({ maxCombo, lightRatio, heavyRatio, aggressivityLabel }: ComboTrackerProps) {
  // Règle 2: Gestion des Erreurs (Fallback UI)
  if (maxCombo === 0 && lightRatio === 0 && heavyRatio === 0) {
    return (
      <div className={`${styles.metricCard} glass-panel`} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', opacity: 0.7 }}>
        <Zap size={24} color="#94a3b8" style={{ marginBottom: '0.5rem' }} />
        <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Pas de données de combo</div>
      </div>
    );
  }

  let badgeColor = 'var(--foreground)';
  let badgeBg = 'rgba(255,255,255,0.1)';
  
  if (aggressivityLabel === 'Agresseur') {
    badgeColor = 'var(--secondary)'; // Blue
    badgeBg = 'rgba(59, 130, 246, 0.2)';
  } else if (aggressivityLabel === 'Punisseur') {
    badgeColor = 'var(--primary)'; // Purple
    badgeBg = 'var(--primary-glow)';
  }

  return (
    <div className={`${styles.metricCard} glass-panel`}>
      <div className={styles.metricHeader}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Zap size={16} /> Combo & Agression
        </h4>
        <div className={styles.qualityBadge} style={{ background: badgeBg, color: badgeColor }}>
          {aggressivityLabel}
        </div>
      </div>
      
      <div className={styles.metricValue}>
        {maxCombo} <span style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: 500 }}>Max Hits Sequence</span>
      </div>
      <p className={styles.metricSubtitle} style={{ marginTop: '0.75rem' }}>
        <strong>Style de jeu :</strong> {Math.round(lightRatio)}% Light / {Math.round(heavyRatio)}% Heavy
      </p>
    </div>
  );
}
