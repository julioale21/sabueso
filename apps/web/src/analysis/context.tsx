/**
 * Hands the AnalysisService to the views. App.tsx is the only place that chooses the
 * implementation (SPEC 03, section 3.2).
 */
import { createContext, useContext } from 'react';
import type { AnalysisService } from './service';

const AnalysisServiceContext = createContext<AnalysisService | null>(null);

export const AnalysisServiceProvider = AnalysisServiceContext.Provider;

/** The service of the closest provider; throws if a view is rendered without one. */
export function useAnalysisService(): AnalysisService {
  const service = useContext(AnalysisServiceContext);
  if (service === null) {
    throw new Error('useAnalysisService needs an AnalysisServiceProvider above it');
  }
  return service;
}
