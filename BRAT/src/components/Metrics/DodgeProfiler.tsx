import React from 'react';
import { ShieldAlert, ShieldCheck, Ghost } from 'lucide-react';
import styles from '../Dashboard/Dashboard.module.css';
import type { DodgeResult } from '../../core/engine/types';

interface DodgeProfilerProps {
  data: DodgeResult;
}

export function DodgeProfiler({ data }: DodgeProfilerProps) {
  // Règle 2 : Gestion des Erreurs (Fallback UI)
  if (data.totalDodges === 0) {
    return (
      <div className={`${styles.metricCard} glass-panel`} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', opacity: 0.7 }}>
        <Ghost size={24} color="#94a3b8" style={{ marginBottom: '0.5rem' }} />
        <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Pas de données d'esquive</div>
      </div>
    );
  }

  const isWarning = data.isPredictable;
  
  // Paramètres du Radar
  const centerX = 50;
  const centerY = 50;
  const maxRadius = 40; // Marge de 10px pour le svg (viewBox=100x100)
  
  // Échelle: max % = 50% (au-delà, cap à maxRadius) pour que de petites valeurs soient visibles
  const scale = (val: number) => Math.min((val / 50) * maxRadius, maxRadius);

  const p = data.percentages;

  // Calcul des coordonnées d'un point selon son pourcentage et son angle
  const getPoint = (val: number, angleDeg: number) => {
    const r = scale(val);
    const rad = (angleDeg - 90) * (Math.PI / 180); // -90 pour commencer "en haut"
    return `${centerX + r * Math.cos(rad)},${centerY + r * Math.sin(rad)}`;
  };

  // Les 8 points du polygone 
  const points = [
    getPoint(p.up, 0),
    getPoint(p.upRight, 45),
    getPoint(p.right, 90),
    getPoint(p.downRight, 135),
    getPoint(p.down, 180),
    getPoint(p.downLeft, 225),
    getPoint(p.left, 270),
    getPoint(p.upLeft, 315),
  ].join(" ");

  // Tracer la toile d'araignée en fond
  const gridLevels = [0.25, 0.5, 0.75, 1]; // 4 niveaux

  return (
    <div className={`${styles.metricCard} glass-panel`}>
      <div className={styles.metricHeader}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {isWarning ? <ShieldAlert size={16} color="var(--danger)" /> : <ShieldCheck size={16} color="var(--success)" />}
          Radar d'Esquive
        </h4>
        <div className={styles.qualityBadge} style={{ 
          background: isWarning ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)', 
          color: isWarning ? 'var(--danger)' : 'var(--success)' 
        }}>
          {data.totalDodges} Utils
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '0.5rem' }}>
        <svg viewBox="0 0 100 100" style={{ width: '100%', maxWidth: '200px', overflow: 'visible' }}>
          
          {/* Lignes radiales (Axes grisés) */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
            const rad = (angle - 90) * (Math.PI / 180);
            return (
              <line key={i} x1={centerX} y1={centerY} x2={centerX + maxRadius * Math.cos(rad)} y2={centerY + maxRadius * Math.sin(rad)} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
            );
          })}

          {/* Anneaux de la grille (Octogones réguliers) */}
          {gridLevels.map((lvl, index) => {
            const r = maxRadius * lvl;
            const pts = [0, 45, 90, 135, 180, 225, 270, 315].map(a => {
              const rad = (a - 90) * (Math.PI / 180);
              return `${centerX + r * Math.cos(rad)},${centerY + r * Math.sin(rad)}`;
            }).join(" ");
            return <polygon key={index} points={pts} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />;
          })}

          {/* Le Polygone de Données */}
          <polygon 
            points={points} 
            fill={isWarning ? "rgba(239, 68, 68, 0.4)" : "rgba(59, 130, 246, 0.5)"} 
            stroke={isWarning ? "#ef4444" : "#3b82f6"} 
            strokeWidth="2" 
            style={{ transition: 'all 0.5s ease-in-out' }}
          />

          {/* Labels simples cardinaux */}
          <text x="50" y="5" fill="#94a3b8" fontSize="6" textAnchor="middle">UP</text>
          <text x="95" y="52" fill="#94a3b8" fontSize="6" textAnchor="middle">R</text>
          <text x="50" y="98" fill="#94a3b8" fontSize="6" textAnchor="middle">DOWN</text>
          <text x="5" y="52" fill="#94a3b8" fontSize="6" textAnchor="middle">L</text>
        </svg>

        {/* Indication du Spot Dodge */}
        <div style={{ marginTop: '0.5rem', textAlign: 'center', fontSize: '0.85rem' }}>
          <span style={{ color: '#94a3b8' }}>Spot Dodge : </span>
          <strong style={{ color: isWarning ? 'var(--danger)' : 'var(--foreground)' }}>
            {Math.round(p.spot)}%
          </strong>
        </div>
      </div>
      
      <div className={styles.metricSubtitle} style={{ marginTop: '0.5rem', textAlign: 'center' }}>
        {isWarning ? (
          <span style={{ color: 'var(--danger)', fontWeight: 500 }}>⚠️ Très prévisible</span>
        ) : (
          <span style={{ color: 'var(--success)', fontWeight: 500 }}>✓ Bonne imprévisibilité</span>
        )}
      </div>
    </div>
  );
}