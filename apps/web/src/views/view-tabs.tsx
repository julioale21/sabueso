/**
 * One tab per view (SPEC 03, section 3.4): first the ones about the analyzed story, then the
 * ones about the grammar alone. The views arrive step by step; until then each tab says which
 * step brings it.
 */
import type { TabItem } from '../components/ui/Tabs';
import type { TabId, ViewProps } from '../state/app-state';
import { AnalysisView } from './AnalysisView';
import { CnfCykView } from './CnfCykView';
import { CompareView } from './CompareView';
import { EarleyPlayerView } from './EarleyPlayerView';
import { Ll1View } from './Ll1View';
import { PdaView } from './PdaView';

/** The two groups of tabs (SPEC 03, section 3.4). */
const STORY_GROUP = 'Sobre el relato';
const GRAMMAR_GROUP = 'Sobre la gramática';

/** Shown on the tabs that need an analyzed story. */
const NEEDS_ANALYSIS = 'Analiza un relato primero (pestaña Análisis)';

export function viewTabs(props: ViewProps): readonly TabItem<TabId>[] {
  // The tabs about the story wait for Analizar; the ones about the grammar are always open.
  const storyTabReason = props.state.analyzedInput === null ? NEEDS_ANALYSIS : undefined;
  return [
    { id: 'analysis', label: 'Análisis', panel: <AnalysisView {...props} />, group: STORY_GROUP },
    {
      id: 'earley',
      label: 'Earley paso a paso',
      panel: <EarleyPlayerView {...props} />,
      disabledReason: storyTabReason,
      group: STORY_GROUP,
    },
    {
      id: 'cnf-cyk',
      label: 'FNC y CYK',
      panel: <CnfCykView {...props} />,
      disabledReason: storyTabReason,
      group: STORY_GROUP,
    },
    {
      id: 'pda',
      label: 'Autómata de pila',
      panel: <PdaView {...props} />,
      disabledReason: storyTabReason,
      group: STORY_GROUP,
    },
    {
      id: 'll1',
      label: 'LL(1)',
      panel: <Ll1View {...props} />,
      group: GRAMMAR_GROUP,
    },
    {
      id: 'compare',
      label: 'G0 vs G1',
      panel: <CompareView {...props} />,
      group: GRAMMAR_GROUP,
    },
  ];
}
