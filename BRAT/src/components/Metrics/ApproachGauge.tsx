import React from 'react';
import { Target } from 'lucide-react';
import styles from '../Dashboard/Dashboard.module.css';

interface ApproachGaugeProps {
  groundedPercentage: number;
  aerialPercentage: number;
  totalApproaches: number;
}

export function ApproachGauge({ groundedPercentage, aerialPercentage, totalApproaches }: ApproachGaugeProps) {
  // Sécuriser les valeurs pour la largeur CSS
  const wGrounded = isNaN(groundedPercentage) ? 50 : groundedPercentage;
  const wAerial = isNaN(aerialPercentage) ? 50 : aerialPercentage;

  return (
    <div className={`${styles.metricCard} glass-panel`}>
      <div className={styles.metricHeader}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Target size={16} /> Approches Aériennes / Sol
        </h4>
      </div>
      
      {/* Container de la progress bar */}
      <div style={{
        marginTop: '1.5rem',
        marginBottom: '1rem',
        height: '24px',
        width: '100%',
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: '9999px',
        display: 'flex',
        overflow: 'hidden',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)'
      }}>
        <div style={{
          width: `${wGrounded}%`,
          backgroundColor: 'var(--secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingLeft: '0.5rem',
          fontSize: '0.75rem',
          fontWeight: '600',
          transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          {wGrounded > 15 && `${Math.round(wGrounded)}% Sol`}
        </div>
        <div style={{
          width: `${wAerial}%`,
          backgroundColor: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingRight: '0.5rem',
          fontSize: '0.75rem',
          fontWeight: '600',
          transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          {wAerial > 15 && `${Math.round(wAerial)}% Air`}
        </div>
      </div>

      <p className={styles.metricSubtitle} style={{ textAlign: 'center' }}>
        Basé sur {totalApproaches} initiations d'attaques.
      </p>
    </div>
  );
}
