/** Runs the analysis of a story on demand and keeps its latest result. */
import type { ParseResult } from '@sabueso/core';
import { useCallback, useRef, useState } from 'react';
import { useAnalysisService } from './context';
import type { GrammarId } from './service';

export interface AnalysisRun {
  /** The result of the latest analysis, or null before the first one. */
  result: ParseResult | null;
  isAnalyzing: boolean;
  analyze: (grammarId: GrammarId, input: string) => void;
}

export function useAnalyze(): AnalysisRun {
  const service = useAnalysisService();
  const [result, setResult] = useState<ParseResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // Only the answer to the latest request counts: an older one that arrives late is dropped.
  const latest = useRef(0);

  const analyze = useCallback(
    (grammarId: GrammarId, input: string) => {
      const request = ++latest.current;
      setIsAnalyzing(true);
      void service.analyze(grammarId, input).then((answer) => {
        if (request === latest.current) {
          setResult(answer);
          setIsAnalyzing(false);
        }
      });
    },
    [service],
  );

  return { result, isAnalyzing, analyze };
}
