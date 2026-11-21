// An analysis with nothing in it, for the views that do not use it (SPEC 06, W2).
import type { AnalysisRun } from '../src/analysis/use-analyze';

export const noAnalysis: AnalysisRun = {
  result: null,
  isAnalyzing: false,
  runCount: 0,
  analyze: () => undefined,
  reset: () => undefined,
};
