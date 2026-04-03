import React, { useRef, useState } from 'react';
import { UploadCloud, FileJson } from 'lucide-react';
import styles from './DropZone.module.css';

interface DropZoneProps {
  onFileSelect: (file: File) => void;
}

export function DropZone({ onFileSelect }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const processFile = (file: File) => {
    if (file && file.name.endsWith('.replay')) {
      onFileSelect(file);
    } else {
      // In a more robust implementation, we'd fire an error toast here.
      console.warn("Fichier rejeté : Seulement les fichiers .replay sont acceptés.");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div
      className={`${styles.container} glass-panel ${isDragOver ? styles.dragOver : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        type="file"
        accept=".replay"
        ref={inputRef}
        onChange={handleChange}
        className={styles.hiddenInput}
      />
      
      <div className={styles.iconContainer}>
        {isDragOver ? (
          <FileJson className={`${styles.icon} ${styles.iconGlow}`} size={64} />
        ) : (
          <UploadCloud className={`${styles.icon} ${styles.iconPulse}`} size={64} />
        )}
      </div>

      <div className={styles.textContainer}>
        <h2 className="text-gradient">Glissez votre .replay ici</h2>
        <p className={styles.subtitle}>
          ou cliquez pour parcourir vos fichiers
        </p>
      </div>
      
      <div className={styles.badgeLabel}>
        Local & Sécurisé
      </div>
    </div>
  );
}
