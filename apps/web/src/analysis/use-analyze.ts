/** Runs the analysis of a story on demand and keeps its latest result. */
import { useCallback, useRef, useState } from 'react';
import { useAnalysisService } from './context';
import type { GrammarId, StoryAnalysis } from './service';

export interface AnalysisRun {
  /** The result of the latest analysis, or null before the first one. */
  result: StoryAnalysis | null;
  isAnalyzing: boolean;
  /** The story of the latest analysis, to redo it with another grammar; null before any. */
  analyzedInput: string | null;
  analyze: (grammarId: GrammarId, input: string) => void;
  /** Forgets the result, as before the first analysis. */
  reset: () => void;
}

export function useAnalyze(): AnalysisRun {
  const service = useAnalysisService();
  const [result, setResult] = useState<StoryAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedInput, setAnalyzedInput] = useState<string | null>(null);
  // Only the answer to the latest request counts: an older one that arrives late is dropped.
  const latest = useRef(0);

  const analyze = useCallback(
    (grammarId: GrammarId, input: string) => {
      const request = ++latest.current;
      setIsAnalyzing(true);
      setAnalyzedInput(input);
      void service.analyze(grammarId, input).then((answer) => {
        if (request === latest.current) {
          setResult(answer);
          setIsAnalyzing(false);
        }
      });
    },
    [service],
  );

  const reset = useCallback(() => {
    latest.current++;
    setResult(null);
    setIsAnalyzing(false);
    setAnalyzedInput(null);
  }, []);

  return { result, isAnalyzing, analyzedInput, analyze, reset };
}
