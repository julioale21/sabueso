/**
 * Autómata de pila (SPEC 03, section 3.4): the automaton of the grammar, its run on the
 * analyzed story and the accepting path as instantaneous descriptions. Concept: from a CFG to
 * a pushdown automaton, accepting by empty stack (guide 26). Everything comes from the core.
 */
import { useAnalysisService } from '../analysis/context';
import { useServiceResult } from '../analysis/use-service-result';
import type { AnalysisService } from '../analysis/service';
import { PdaDefinition } from '../components/pda/PdaDefinition';
import { PdaPlayer } from '../components/pda/PdaPlayer';
import { PdaVerdict } from '../components/pda/PdaVerdict';
import { TransitionList } from '../components/pda/TransitionList';
import { MutedText } from '../components/ui/MutedText';
import { Panel } from '../components/ui/Panel';
import { splitTags } from '../domain/tags';
import type { ViewProps } from '../state/app-state';

/** With more tags the table of descriptions can no longer be read (SPEC 03, section 3.4). */
export const MAX_PDA_TOKENS = 10;

type PushdownAnswer = Awaited<ReturnType<AnalysisService['pushdown']>>;

export function PdaView({ state }: ViewProps) {
  const service = useAnalysisService();
  // The story of the latest Analizar (the tab is disabled before it).
  const input = state.analyzedInput ?? '';
  const tokens = splitTags(input);
  const tooLong = tokens.length > MAX_PDA_TOKENS;
  const answer = useServiceResult<PushdownAnswer>(
    () => (tooLong ? null : service.pushdown(state.grammarId, input)),
    [service, state.grammarId, input, tooLong],
  );

  if (tooLong) {
    return (
      <MutedText>
        El relato analizado tiene {tokens.length} etiquetas: acorta la entrada a {MAX_PDA_TOKENS} o
        menos para ver el autómata de pila.
      </MutedText>
    );
  }
  if (answer === null) {
    return <MutedText>Simulando el autómata…</MutedText>;
  }
  const { automaton, run } = answer;
  return (
    <Panel title={`Autómata de pila · ${input.trim() === '' ? 'ε (relato vacío)' : input}`}>
      <div className="space-y-3">
        <PdaDefinition automaton={automaton} />
        <PdaVerdict run={run} />
        {run.acceptingPath !== null && (
          <PdaPlayer path={run.acceptingPath} tokens={tokens} automaton={automaton} />
        )}
        <TransitionList automaton={automaton} path={run.acceptingPath} />
      </div>
    </Panel>
  );
}
