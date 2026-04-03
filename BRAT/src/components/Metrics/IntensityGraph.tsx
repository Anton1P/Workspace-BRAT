import React from 'react';
import { Activity } from 'lucide-react';
import styles from '../Dashboard/Dashboard.module.css';
import type { IntensityResult } from '../../core/engine/types';
import type { ReplayData } from 'brat-parser-lib';

interface IntensityGraphProps {
  data: IntensityResult;
  replay: ReplayData;
}

export function IntensityGraph({ data, replay }: IntensityGraphProps) {
  // Règle 2 : Gestion des Erreurs (Fallback UI)
  if (!data || data.buckets.length === 0 || data.maxAPM === 0) {
    return (
      <div className={`${styles.metricCard} glass-panel`} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', opacity: 0.7, gridColumn: '1 / -1', minHeight: '150px' }}>
        <Activity size={24} color="#94a3b8" style={{ marginBottom: '0.5rem' }} />
        <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Pas de données d'intensité de match</div>
      </div>
    );
  }

  // Format MM:SS
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Couleurs standards indexables pour les entités (ex: Bleu pour J1, Rouge pour J2)
  const playerColors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b']; 

  return (
    <div className={`${styles.metricCard} glass-panel`} style={{ gridColumn: '1 / -1' }}>
      <div className={styles.metricHeader}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Activity size={16} color="var(--primary)" />
          Intensité du Match (APM sur 10s)
        </h4>
        <div className={styles.qualityBadge} style={{ background: 'rgba(255,255,255,0.1)', color: '#cbd5e1' }}>
          Pic: {data.maxAPM} APM
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', height: '120px', gap: '2px', marginTop: '1rem' }}>
        {data.buckets.map((bucket, bIdx) => {
          const timeLabel = formatTime(bucket.timeMs);
          
          // Construit le tooltip (ex: 0:10 - 0:20 \n Bödvar: 230 APM)
          const tooltipLines = replay.entities.map(ent => {
            const apm = bucket.apms[ent.id] || 0;
            return `${ent.name}: ${apm} APM`;
          });
          const tooltip = `[${timeLabel} - ${formatTime(bucket.timeMs + data.intervalMs)}]\n${tooltipLines.join('\n')}`;

          return (
            <div 
              key={bIdx} 
              title={tooltip} 
              style={{ 
                flex: 1, 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'flex-end', 
                height: '100%', 
                gap: '1px', 
                opacity: 0.9, 
                cursor: 'crosshair',
                transition: 'opacity 0.2s'
              }} 
            >
              {replay.entities.map((ent, i) => {
                const apm = bucket.apms[ent.id] || 0;
                const heightPct = data.maxAPM > 0 ? (apm / data.maxAPM) * 100 : 0;
                const color = playerColors[i % playerColors.length];
                
                return (
                  <div 
                    key={ent.id} 
                    style={{ 
                      width: '100%', 
                      maxWidth: '16px', 
                      height: `${heightPct}%`, 
                      background: color,
                      borderRadius: '2px 2px 0 0',
                      transition: 'height 0.3s ease'
                    }} 
                  />
                );
              })}
            </div>
          );
        })}
      </div>
      
      {/* Timeline X-Axis en dessous du graphique */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem' }}>
        <span>0:00</span>
        <span>{formatTime(data.buckets.length * data.intervalMs)}</span>
      </div>
    </div>
  );
}