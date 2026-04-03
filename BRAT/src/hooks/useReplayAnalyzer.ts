import { useState, useCallback } from 'react';
import { parseReplay, type ReplayData } from 'brat-parser-lib';

export type AnalyzerState =
  | { status: 'idle' }
  | { status: 'loading'; fileName: string }
  | { status: 'success'; data: ReplayData; fileName: string }
  | { status: 'error'; error: string; fileName: string };

export function useReplayAnalyzer() {
  const [state, setState] = useState<AnalyzerState>({ status: 'idle' });

  const processFile = useCallback(async (file: File) => {
    setState({ status: 'loading', fileName: file.name });

    try {
      // Simulate real file reading delay for smooth UI
      const awaitTimeout = new Promise((resolve) => setTimeout(resolve, 800));
      
      const buffer = await file.arrayBuffer();
      const parsedData = parseReplay(buffer);

      await awaitTimeout; // Guarantee at least 800ms loading for UX

      setState({
        status: 'success',
        data: parsedData,
        fileName: file.name,
      });
    } catch (error: any) {
      console.error('Replay processing error:', error);
      setState({
        status: 'error',
        error: error.message || 'Une erreur est survenue lors de la lecture du fichier.',
        fileName: file.name,
      });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ status: 'idle' });
  }, []);

  return { state, processFile, reset };
}
