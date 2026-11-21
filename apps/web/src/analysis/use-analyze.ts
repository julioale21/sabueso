/**
 * Runs the analysis of a story on demand and keeps its latest result. The core answers in a few
 * milliseconds, too fast to notice that something happened, so the busy state lasts at least
 * a short while: the button shows "Analizando…" and the result then appears.
 */
import { useCallback, useRef, useState } from 'react';
import { useAnalysisService } from './context';
import type { GrammarId, StoryAnalysis } from './service';

/** How long the busy state lasts at least, in milliseconds. */
export const MINIMUM_ANALYSIS_TIME = 400;

const pause = (milliseconds: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });

export interface AnalysisRun {
  /** The result of the latest analysis, or null before the first one. */
  result: StoryAnalysis | null;
  isAnalyzing: boolean;
  /** How many analyses have finished: a new number means a new result to show. */
  runCount: number;
  analyze: (grammarId: GrammarId, input: string) => void;
  /** Forgets the result, as before the first analysis. */
  reset: () => void;
}

export function useAnalyze(): AnalysisRun {
  const service = useAnalysisService();
  const [result, setResult] = useState<StoryAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [runCount, setRunCount] = useState(0);
  // Only the answer to the latest request counts: an older one that arrives late is dropped.
  const latest = useRef(0);

  const analyze = useCallback(
    (grammarId: GrammarId, input: string) => {
      const request = ++latest.current;
      setIsAnalyzing(true);
      void Promise.all([service.analyze(grammarId, input), pause(MINIMUM_ANALYSIS_TIME)]).then(
        ([answer]) => {
          if (request === latest.current) {
            setResult(answer);
            setIsAnalyzing(false);
            setRunCount((count) => count + 1);
          }
        },
      );
    },
    [service],
  );

  const reset = useCallback(() => {
    latest.current++;
    setResult(null);
    setIsAnalyzing(false);
  }, []);

  return { result, isAnalyzing, runCount, analyze, reset };
}
