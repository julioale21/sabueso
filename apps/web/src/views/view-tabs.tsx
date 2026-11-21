/**
 * One tab per view, in the order of the analysis (SPEC 03, section 3.4). The views arrive step
 * by step; until then each tab says which step brings it.
 */
import { PendingView } from '../components/PendingView';
import type { TabItem } from '../components/ui/Tabs';
import type { TabId, ViewProps } from '../state/app-state';
import { AnalysisView } from './AnalysisView';
import { EarleyPlayerView } from './EarleyPlayerView';

export function viewTabs(props: ViewProps): readonly TabItem<TabId>[] {
  return [
    { id: 'analysis', label: 'Análisis', panel: <AnalysisView {...props} /> },
    {
      id: 'earley',
      label: 'Earley paso a paso',
      panel: <EarleyPlayerView {...props} />,
    },
    {
      id: 'll1',
      label: 'LL(1)',
      panel: <PendingView concept="FIRST, FOLLOW y la tabla LL(1)" step={11} />,
    },
    {
      id: 'cnf-cyk',
      label: 'FNC y CYK',
      panel: <PendingView concept="Forma Normal de Chomsky y CYK" step={12} />,
    },
    {
      id: 'pda',
      label: 'Autómata de pila',
      panel: <PendingView concept="Autómata de pila" step={13} />,
    },
    {
      id: 'compare',
      label: 'G0 vs G1',
      panel: <PendingView concept="Testigo de ambigüedad y comparación" step={14} />,
    },
  ];
}
