import React, { useState, useMemo } from 'react';
import type { ReplayData } from 'brat-parser-lib';
import { analyzeTier1 } from '../../core/engine/analyzer';
import { Swords, Clock, TrendingUp } from 'lucide-react';
import { APMTracker } from '../Metrics/APMTracker';
import { ApproachGauge } from '../Metrics/ApproachGauge';
import { ComboTracker } from '../Metrics/ComboTracker';
import { DodgeProfiler } from '../Metrics/DodgeProfiler';
import { IntensityGraph } from '../Metrics/IntensityGraph';
import { KillTimeline } from '../KillTimeline/KillTimeline';
import { LegendMap, StanceMap, getWeaponThumbnail } from '@/utils/brawlhalla-data';
import styles from './Dashboard.module.css';

interface DashboardProps {
  replayData: ReplayData;
  onReset: () => void;
}

export function Dashboard({ replayData, onReset }: DashboardProps) {
  // Sélection du joueur par défaut (le premier)
  const defaultEntityId = replayData.entities.length > 0 ? replayData.entities[0].id : 0;
  const [selectedEntityId, setSelectedEntityId] = useState<number>(defaultEntityId);

  // Conversion de la durée de millisecondes en format MM:SS
  const formatDuration = (ms: number) => {
    if (!ms) return "00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Calcul du moteur d'analyse
  const tier1Analysis = useMemo(() => analyzeTier1(replayData, selectedEntityId), [replayData, selectedEntityId]);
  
  // Récupération de l'identité du joueur
  const selectedEntity = replayData.entities.find(e => e.id === selectedEntityId);
  const heroId = selectedEntity?.data?.heroes && selectedEntity.data.heroes.length > 0
    ? selectedEntity.data.heroes[0].heroId 
    : "Non détecté";

  // Récupération globale du vainqueur
  const team1 = replayData.entities.filter(e => e.data.team === 1);
  const team2 = replayData.entities.filter(e => e.data.team === 2);

  return (
    <div className={styles.container}>
      <header className={`${styles.header} glass-panel`}>
        <div className={styles.headerLeft}>
          <Swords className="text-gradient" size={32} />
          <div>
            <h1 className={styles.title}>Résumé du Match</h1>
            <div className={styles.meta}>
              <span className="flex-center" style={{ gap: '0.25rem' }}><Clock size={14} /> {formatDuration(replayData.length)}</span>
              <span>•</span>
              <span className={styles.badge}>Patch {(replayData.version / 100).toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        <button onClick={onReset} className={styles.btnSecondary}>
          Analyser un autre Replay
        </button>
      </header>
      
      <div className={styles.gridLayout}>
        {/* Colonne Gauche: Roster / Équipes */}
        <aside className={`${styles.rosterCard} glass-panel`}>
          <h2 className={styles.cardTitle}>Joueurs</h2>
          <div className={styles.teamList}>
            {replayData.entities.map(entity => {
              const heroId = entity.data.heroes && entity.data.heroes.length > 0 ? entity.data.heroes[0].heroId : -1;
              const legend = LegendMap[heroId];
              
              return (
                <button 
                  key={entity.id}
                  onClick={() => setSelectedEntityId(entity.id)}
                  className={`${styles.playerRow} ${selectedEntityId === entity.id ? styles.playerRowActive : ''}`}
                >
                  {legend?.thumbnailUrl ? (
                    <img 
                      src={legend.thumbnailUrl} 
                      alt={legend.name} 
                      className={styles.playerAvatarSmall}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className={`${styles.playerAvatarSmall} ${styles.playerAvatarFallbackSmall}`}>?</div>
                  )}
                  
                  <span className={styles.playerName}>{entity.name}</span>
                  <span className={styles.scoreBadge}>
                    {(() => {
                      const rank = replayData.results[entity.id];
                      if (rank === 1) return '1st';
                      if (rank === 2) return '2nd';
                      if (rank === 3) return '3rd';
                      return `${rank}th`;
                    })()}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Colonne Droite: Statistiques du joueur sélectionné */}
        <main className={styles.statsContainer}>
          {/* Nouvelle Carte Héros Visuelle */}
          <div className={`${styles.heroCard} glass-panel`}>
            {(() => {
              const heroData = selectedEntity?.data?.heroes && selectedEntity.data.heroes.length > 0 
                ? selectedEntity.data.heroes[0] 
                : null;
              
              const legend = heroData ? LegendMap[heroData.heroId] : null;
              const stance = heroData ? StanceMap[heroData.stance] || StanceMap[1] : null;

              return (
                <>
                  {legend?.thumbnailUrl ? (
                    <img 
                      src={legend.thumbnailUrl} 
                      alt={legend.name} 
                      className={styles.heroAvatarLarge}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className={`${styles.heroAvatarLarge} ${styles.heroAvatarFallbackLarge}`}>?</div>
                  )}

                  <div className={styles.heroInfo}>
                    <div className={styles.heroHeaderRow}>
                      <div className={styles.heroIdentity}>
                        <span className={styles.heroName}>{legend ? legend.name : `Hero ID: ${heroData?.heroId || 'Inconnu'}`}</span>
                        <span className={styles.playerNameSub}>{selectedEntity?.name}</span>
                      </div>
                    </div>
                    
                    <div className={styles.badgeRow}>
                      {stance && (
                        <span className={styles.heroBadge}>
                          <span className={styles.stanceIndicator} style={{ backgroundColor: stance.color }}></span>
                          Stance: {stance.name}
                        </span>
                      )}
                      
                      {legend && (
                        <>
                          <span className={styles.heroBadge}>
                            <img src={getWeaponThumbnail(legend.weapon1)} alt={legend.weapon1} className={styles.weaponIcon} />
                            {legend.weapon1}
                          </span>
                          <span className={styles.heroBadge}>
                            <img src={getWeaponThumbnail(legend.weapon2)} alt={legend.weapon2} className={styles.weaponIcon} />
                            {legend.weapon2}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
          
          <h3 className={styles.sectionTitle}>
            <TrendingUp size={20} className="text-gradient" /> 
            Métriques d'Exécution (Tier 1)
          </h3>
          
          <div className={styles.metricsGrid}>
            <div className={`${styles.metricCard} glass-panel`}>
              <div className={styles.metricHeader}>
                <h4>Signature Efficiency</h4>
                <div className={styles.qualityBadge} style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
                  Bon
                </div>
              </div>
              
              <div className={styles.metricValue}>
                {(tier1Analysis.signatureEfficiency.efficiencyRatio * 100).toFixed(0)}%
              </div>
              <p className={styles.metricSubtitle}>
                {tier1Analysis.signatureEfficiency.heavyAttackHits} Sigs ayant touché sur {tier1Analysis.signatureEfficiency.totalHeavyAttackInputs} tentatives.
              </p>
            </div>

            <APMTracker 
              apm={tier1Analysis.apm.actionsPerMinute} 
              category={tier1Analysis.apm.category} 
            />

            <ApproachGauge 
              groundedPercentage={tier1Analysis.approachRatio.groundedPercentage}
              aerialPercentage={tier1Analysis.approachRatio.aerialPercentage}
              totalApproaches={tier1Analysis.approachRatio.totalApproaches}
            />

            <ComboTracker 
              maxCombo={tier1Analysis.combo.maxCombo}
              lightRatio={tier1Analysis.combo.lightRatio}
              heavyRatio={tier1Analysis.combo.heavyRatio}
              aggressivityLabel={tier1Analysis.combo.aggressivityLabel}
            />

            <DodgeProfiler data={tier1Analysis.dodge} />
            <IntensityGraph data={tier1Analysis.intensity} replay={replayData} />
          </div>
        </main>
      </div>

      <KillTimeline replay={replayData} />
    </div>
  );
}
