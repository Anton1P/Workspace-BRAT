'use client';

/**
 * DebugReplayLoader — Temporary proof-of-concept component for Phase 1.
 *
 * Provides a simple file input to load a .replay file, parse it via
 * parseReplay(), and dump the results to the browser console.
 *
 * This component will be replaced by the DropZone in Phase 2.
 */

import { useState } from 'react';
import { parseReplay, decodeInputState, detectInputAnomalies, type ReplayData } from 'brat-parser-lib';

export default function DebugReplayLoader() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [replayData, setReplayData] = useState<ReplayData | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.replay')) {
      setStatus('error');
      setErrorMessage(`Fichier invalide : "${file.name}". Seuls les fichiers .replay sont acceptés.`);
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = parseReplay(arrayBuffer);

      // Log the full ReplayData to the console
      console.log('=== BRAT — ReplayData ===');
      console.log('Full ReplayData:', result);
      console.log('Version:', result.version);
      console.log('Match Duration (ms):', result.length);
      console.log('Playlist:', result.playlistName ?? `ID ${result.playlistId}`);
      console.log('Level ID:', result.levelId);
      console.log('Online:', result.onlineGame);

      // Log entities
      console.log('\n=== Entities ===');
      for (const entity of result.entities) {
        console.log(`  Player "${entity.name}" (ID: ${entity.id})`);
        console.log(`    Team: ${entity.data.team}`);
        console.log(`    Bot: ${entity.data.bot}`);
        console.log(`    Heroes:`, entity.data.heroes.map(h => `heroId=${h.heroId}, costumeId=${h.costumeId}, stance=${h.stance}, weaponSkin1=${h.weaponSkin1}, weaponSkin2=${h.weaponSkin2}`));
      }

      // Log deaths
      console.log('\n=== Deaths ===');
      for (const death of result.deaths) {
        console.log(`  Entity ${death.entityId} died at ${death.timestamp}ms`);
      }

      // Log decoded inputs (first 20 per player)
      console.log('\n=== Decoded Inputs (first 20 per player) ===');
      for (const [entityId, inputs] of Object.entries(result.inputs)) {
        console.log(`  Entity ${entityId} — Total inputs: ${inputs.length}`);
        const sample = inputs.slice(0, 20);
        for (const input of sample) {
          const decoded = decodeInputState(input.inputState);
          const anomalies = detectInputAnomalies(input.inputState);
          const anomalyStr = anomalies.length > 0 ? ` ⚠️ ${anomalies.join(', ')}` : '';
          console.log(
            `    t=${input.timestamp}ms: [${decoded.join(', ')}] (raw: 0b${input.inputState.toString(2).padStart(14, '0')})${anomalyStr}`
          );
        }
      }

      // Log results
      console.log('\n=== Match Results ===');
      for (const [entityId, score] of Object.entries(result.results)) {
        console.log(`  Entity ${entityId}: score=${score}`);
      }

      setReplayData(result);
      setStatus('success');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('Parsing error:', error);
      setStatus('error');
      setErrorMessage(msg);
    }
  }

  return (
    <div style={{
      maxWidth: '600px',
      margin: '2rem auto',
      padding: '2rem',
      fontFamily: 'Inter, sans-serif',
      background: '#12121A',
      borderRadius: '12px',
      border: '1px solid rgba(255,255,255,0.06)',
      color: '#E2E8F0',
    }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#3B82F6' }}>
        🔬 BRAT — Debug Replay Loader
      </h1>
      <p style={{ color: '#94A3B8', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
        Phase 1 — Proof of Concept. Ouvrez la console DevTools (F12) pour voir les données parsées.
      </p>

      <input
        type="file"
        accept=".replay"
        onChange={handleFileChange}
        style={{
          padding: '0.75rem',
          border: '2px dashed rgba(59, 130, 246, 0.4)',
          borderRadius: '8px',
          background: 'rgba(59, 130, 246, 0.05)',
          color: '#E2E8F0',
          width: '100%',
          cursor: 'pointer',
        }}
      />

      {status === 'loading' && (
        <p style={{ marginTop: '1rem', color: '#3B82F6' }}>⏳ Parsing en cours...</p>
      )}

      {status === 'error' && (
        <p style={{ marginTop: '1rem', color: '#EF4444' }}>❌ {errorMessage}</p>
      )}

      {status === 'success' && replayData && (
        <div style={{ marginTop: '1rem' }}>
          <p style={{ color: '#10B981', fontWeight: 600 }}>✅ Replay parsé avec succès !</p>
          <ul style={{ marginTop: '0.5rem', color: '#94A3B8', fontSize: '0.875rem', listStyle: 'none', padding: 0 }}>
            <li>📊 Version: {replayData.version}</li>
            <li>⏱️ Durée: {(replayData.length / 1000).toFixed(1)}s</li>
            <li>👥 Joueurs: {replayData.entities.map(e => e.name).join(', ')}</li>
            <li>💀 Morts: {replayData.deaths.length}</li>
            <li>🎮 Inputs: {Object.values(replayData.inputs).reduce((sum, arr) => sum + arr.length, 0)} événements</li>
          </ul>
          <p style={{ marginTop: '0.75rem', color: '#8B5CF6', fontSize: '0.75rem' }}>
            Consultez la console DevTools (F12) pour les données complètes.
          </p>
        </div>
      )}
    </div>
  );
}
