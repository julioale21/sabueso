/**
 * One tab per view (SPEC 03, section 3.4): first the ones about the analyzed story, then the
 * ones about the grammar alone. The views arrive step by step; until then each tab says which
 * step brings it.
 */
import { PendingView } from '../components/PendingView';
import type { TabItem } from '../components/ui/Tabs';
import type { TabId, ViewProps } from '../state/app-state';
import { AnalysisView } from './AnalysisView';
import { EarleyPlayerView } from './EarleyPlayerView';
import { Ll1View } from './Ll1View';

/** Shown on the tabs that need an analyzed story. */
const NEEDS_ANALYSIS = 'Analiza un relato primero (pestaña Análisis)';

export function viewTabs(props: ViewProps): readonly TabItem<TabId>[] {
  // The tabs about the story wait for Analizar; the ones about the grammar are always open.
  const storyTabReason = props.state.analyzedInput === null ? NEEDS_ANALYSIS : undefined;
  return [
    { id: 'analysis', label: 'Análisis', panel: <AnalysisView {...props} /> },
    {
      id: 'earley',
      label: 'Earley paso a paso',
      panel: <EarleyPlayerView {...props} />,
      disabledReason: storyTabReason,
    },
    {
      id: 'cnf-cyk',
      label: 'FNC y CYK',
      panel: <PendingView concept="Forma Normal de Chomsky y CYK" step={12} />,
      disabledReason: storyTabReason,
    },
    {
      id: 'pda',
      label: 'Autómata de pila',
      panel: <PendingView concept="Autómata de pila" step={13} />,
      disabledReason: storyTabReason,
    },
    {
      id: 'll1',
      label: 'LL(1)',
      panel: <Ll1View {...props} />,
    },
    {
      id: 'compare',
      label: 'G0 vs G1',
      panel: <PendingView concept="Testigo de ambigüedad y comparación" step={14} />,
    },
  ];
}
