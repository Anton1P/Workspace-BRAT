"use client";

import React from 'react';
import { useReplayAnalyzer } from '@/hooks/useReplayAnalyzer';
import { DropZone } from '@/components/DropZone/DropZone';
import { Loader } from '@/components/Loader/Loader';
import { Dashboard } from '@/components/Dashboard/Dashboard';

export default function Home() {
  const { state, processFile, reset } = useReplayAnalyzer();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      {state.status === 'idle' && (
        <DropZone onFileSelect={processFile} />
      )}

      {state.status === 'loading' && (
        <Loader fileName={state.fileName} />
      )}

      {state.status === 'error' && (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', maxWidth: '500px' }}>
          <h2 style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '1.5rem', fontWeight: '600' }}>
            Oups ! Une erreur est survenue
          </h2>
          <p style={{ color: '#94a3b8', marginBottom: '2rem', lineHeight: '1.5' }}>
            {state.error}
          </p>
          <button 
            onClick={reset}
            style={{
              background: 'linear-gradient(to right, var(--primary), var(--secondary))',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            Réessayer avec un autre fichier
          </button>
        </div>
      )}

      {state.status === 'success' && state.data && (
        <Dashboard replayData={state.data} onReset={reset} />
      )}
    </div>
  );
}
