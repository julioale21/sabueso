/**
 * The page: a header and one tab per view, in the order of the analysis (SPEC 03, section 3.1).
 * The views arrive step by step; until then each tab says which step brings it.
 */
import { useState } from 'react';
import { AnalysisServiceProvider } from './analysis/context';
import { createLocalAnalysisService } from './analysis/local-service';
import { Tabs, type TabItem } from './components/ui/Tabs';

/** The only place that chooses how the core runs: here, in the browser (SPEC 03, section 3.2). */
const analysisService = createLocalAnalysisService();

/** The views of the page (SPEC 03, section 4). */
export type TabId = 'analysis' | 'earley' | 'll1' | 'cnf-cyk' | 'pda' | 'compare';

/** A placeholder for a view that a later step builds. */
function Pending({ concept, step }: { concept: string; step: number }) {
  return (
    <p className="text-sm text-slate-500 dark:text-slate-400">
      {concept}: llega en el paso {step} del SPEC 03.
    </p>
  );
}

const TABS: readonly TabItem<TabId>[] = [
  {
    id: 'analysis',
    label: 'Análisis',
    panel: <Pending concept="Análisis de un relato" step={9} />,
  },
  {
    id: 'earley',
    label: 'Earley paso a paso',
    panel: <Pending concept="Earley paso a paso" step={10} />,
  },
  {
    id: 'll1',
    label: 'LL(1)',
    panel: <Pending concept="FIRST, FOLLOW y la tabla LL(1)" step={11} />,
  },
  {
    id: 'cnf-cyk',
    label: 'FNC y CYK',
    panel: <Pending concept="Forma Normal de Chomsky y CYK" step={12} />,
  },
  { id: 'pda', label: 'Autómata de pila', panel: <Pending concept="Autómata de pila" step={13} /> },
  {
    id: 'compare',
    label: 'G0 vs G1',
    panel: <Pending concept="Testigo de ambigüedad y comparación" step={14} />,
  },
];

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>('analysis');
  return (
    <AnalysisServiceProvider value={analysisService}>
      <div className="mx-auto max-w-7xl px-4 py-6">
        <header className="mb-4">
          <h1 className="text-2xl font-semibold">Sabueso</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            ¿El relato respeta la estructura del policial de enigma? Una gramática libre de contexto
            y el analizador de Earley lo deciden.
          </p>
        </header>
        <main>
          <Tabs label="Vistas" items={TABS} activeId={activeTab} onChange={setActiveTab} />
        </main>
      </div>
    </AnalysisServiceProvider>
  );
}
