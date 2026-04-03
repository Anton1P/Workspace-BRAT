import React, { useState } from 'react';
import { Activity } from 'lucide-react';
import styles from '../Dashboard/Dashboard.module.css';
import type { IntensityResult } from '../../core/engine/types';
import type { ReplayData } from 'brat-parser-lib';

interface IntensityGraphProps {
  data: IntensityResult;
  replay: ReplayData;
}

export function IntensityGraph({ data, replay }: IntensityGraphProps) {
  const [hoveredBucket, setHoveredBucket] = useState<number | null>(null);

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

      <div style={{ display: 'flex', alignItems: 'flex-end', height: '120px', gap: '2px', marginTop: '1rem', position: 'relative' }}>
        {data.buckets.map((bucket, bIdx) => {
          const timeLabel = formatTime(bucket.timeMs);
          const endTimeLabel = formatTime(bucket.timeMs + data.intervalMs);

          return (
            <div 
              key={bIdx} 
              onMouseEnter={() => setHoveredBucket(bIdx)}
              onMouseLeave={() => setHoveredBucket(null)}
              style={{ 
                flex: 1, 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'flex-end', 
                height: '100%', 
                gap: '1px', 
                position: 'relative',
                opacity: hoveredBucket === null || hoveredBucket === bIdx ? 0.9 : 0.3, 
                cursor: 'crosshair',
                transition: 'opacity 0.2s, transform 0.2s',
                transform: hoveredBucket === bIdx ? 'scaleY(1.05)' : 'scaleY(1)',
                transformOrigin: 'bottom'
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
                      transition: 'height 0.3s ease, filter 0.2s',
                      filter: hoveredBucket === bIdx ? 'brightness(1.2)' : 'brightness(1)'
                    }} 
                  />
                );
              })}
              
              {/* Custom Hover Tooltip */}
              {hoveredBucket === bIdx && (
                <div style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 6px)',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#0f172a',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#f8fafc',
                  padding: '4px 6px',
                  borderRadius: '4px',
                  fontSize: '0.65rem',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
                  zIndex: 50,
                  pointerEvents: 'none',
                  animation: 'tooltipFadeIn 0.15s ease-out forwards'
                }}>
                  {/* Flèche du tooltip (approximative via CSS inline absolute) */}
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    borderWidth: '4px',
                    borderStyle: 'solid',
                    borderColor: '#0f172a transparent transparent transparent'
                  }} />

                  <div style={{ fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '3px', marginBottom: '3px', textAlign: 'center' }}>
                    {timeLabel} - {endTimeLabel}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {replay.entities.map((ent, i) => {
                      const apm = bucket.apms[ent.id] || 0;
                      return (
                        <div key={ent.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ 
                            display: 'inline-block', 
                            width: '6px', 
                            height: '6px', 
                            borderRadius: '50%', 
                            background: playerColors[i % playerColors.length],
                            flexShrink: 0
                          }} />
                          <span style={{ 
                            fontWeight: 500, 
                            color: '#e2e8f0',
                            maxWidth: '70px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>{ent.name}</span>
                          <span style={{ marginLeft: '6px', paddingLeft: '6px', borderLeft: '1px solid rgba(255,255,255,0.1)', fontWeight: 'bold' }}>{apm} APM</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
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