import React, { useState } from 'react';
import type { ReplayData, Death } from 'brat-parser-lib';
import Image from 'next/image';
import { LegendMap, getLegendThumbnail } from '../../utils/brawlhalla-data';
import styles from './KillTimeline.module.css';

interface KillTimelineProps {
  replay: ReplayData;
}

export function KillTimeline({ replay }: KillTimelineProps) {
  const { deaths, length, entities } = replay;
  const [hoveredDeath, setHoveredDeath] = useState<number | null>(null);

  // Conversion ms -> MM:SS
  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!deaths || deaths.length === 0) {
    return null; // ou un empty state discret
  }

  return (
    <div className={`${styles.container} glass-panel`}>
      <h3 className={styles.title}>Timeline des Éliminations</h3>
      
      <div className={styles.timelineWrapper}>
        {/* La ligne directrice fondatrice */}
        <div className={styles.timelineLine}></div>
        
        {/* Placement des marqueurs de morts */}
        {deaths.map((death: Death, index: number) => {
          const positionPercent = (death.timestamp / length) * 100;
          
          // Recherche de l'entité
          const victim = entities.find(e => e.id === death.entityId);
          const team = victim?.data?.team;
          
          // Le `heroId` se trouve dans le tableau des héros sélectionnés par le joueur
          const heroId = victim?.data?.heroes?.[0]?.heroId;
          
          const legendInfo = heroId ? LegendMap[heroId] : null;
          const legendName = legendInfo ? legendInfo.name : 'Inconnu';
          
          if (!legendInfo && heroId) {
            console.log(`[CDD KillTimeline] Missing LegendMap entry for heroId: ${heroId}`);
          }

          // Génération stricte de l'URL basée sur le dossier local (public/assets/legends/avatars/)
          const avatarUrl = legendInfo?.thumbnailUrl 
            ? legendInfo.thumbnailUrl 
            : null;
          
          // Couleur et bordure selon l'équipe
          let borderColor = 'var(--foreground)'; // default
          let glowColor = 'transparent';
          
          if (team === 1) {
            borderColor = 'var(--secondary)'; // Bleu électrique
            glowColor = 'rgba(59, 130, 246, 0.4)';
          } else if (team === 2) {
            borderColor = '#ec4899'; // Pink/Red vif
            glowColor = 'rgba(236, 72, 153, 0.4)';
          }

          return (
            <div 
              key={`death-${index}`}
              className={styles.markerContainer}
              style={{ left: `${positionPercent}%` }}
              onMouseEnter={() => setHoveredDeath(index)}
              onMouseLeave={() => setHoveredDeath(null)}
            >
              <div 
                className={styles.markerIcon}
                style={{ 
                  borderColor, 
                  boxShadow: `0 0 8px ${glowColor}, inset 0 0 4px ${glowColor}`,
                  borderRadius: '50%',
                  borderWidth: '2px',
                  borderStyle: 'solid',
                  overflow: 'hidden',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  transform: 'translateY(-50%)',
                  position: 'absolute',
                  top: '50%',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                {avatarUrl ? (
                  <Image 
                    src={avatarUrl}
                    alt={`Avatar de ${legendName}`}
                    width={28}
                    height={28}
                    className="rounded-full object-cover"
                    unoptimized // Pour autoriser les URLs externes non configurées ou locales
                  />
                ) : (
                  <span>?</span>
                )}
              </div>
              
              {hoveredDeath === index && (
                <div className={styles.tooltip}>
                  <strong>{victim?.name || `Joueur inconnu`} ({legendName})</strong> éliminé à {formatDuration(death.timestamp)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className={styles.timelineLabels}>
        <span>00:00</span>
        <span>{formatDuration(length)}</span>
      </div>
    </div>
  );
}
