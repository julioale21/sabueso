/** The genres and grammars of the catalog, asked once to the AnalysisService. */
import { useAnalysisService } from './context';
import type { AnalysisService } from './service';
import { useServiceResult } from './use-service-result';

export type Catalog = Awaited<ReturnType<AnalysisService['grammars']>>;

/** null while loading. */
export function useGrammars(): Catalog | null {
  const service = useAnalysisService();
  return useServiceResult(() => service.grammars(), [service]);
}
