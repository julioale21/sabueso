/** The genres and grammars of the catalog, asked once to the AnalysisService. */
import { useEffect, useState } from 'react';
import { useAnalysisService } from './context';
import type { AnalysisService } from './service';

export type Catalog = Awaited<ReturnType<AnalysisService['grammars']>>;

/** null while loading. */
export function useGrammars(): Catalog | null {
  const service = useAnalysisService();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  useEffect(() => {
    let current = true;
    void service.grammars().then((loaded) => {
      if (current) {
        setCatalog(loaded);
      }
    });
    return () => {
      current = false;
    };
  }, [service]);
  return catalog;
}
