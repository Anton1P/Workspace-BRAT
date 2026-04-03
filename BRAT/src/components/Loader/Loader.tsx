import React from 'react';
import { Loader2 } from 'lucide-react';
import styles from './Loader.module.css';

interface LoaderProps {
  fileName?: string;
}

export function Loader({ fileName }: LoaderProps) {
  return (
    <div className={`${styles.container} glass-panel`}>
      <Loader2 className={styles.spinner} size={48} />
      <h3 className={styles.title}>Analyse en cours...</h3>
      {fileName && <p className={styles.fileName}>{fileName}</p>}
      <div className={styles.disclaimer}>
        Traitement 100% local — vos données ne quittent jamais votre appareil.
      </div>
    </div>
  );
}
