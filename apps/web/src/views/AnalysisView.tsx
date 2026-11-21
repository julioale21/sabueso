/**
 * The main view: the story, and its analysis (SPEC 03, sections 3.1 and 3.4). Concepts: the
 * alphabet and a string over it (card 01), the grammar and its analysis (cards 02 and 06 to
 * 10); the result arrives in step 9 (cards 17 to 21).
 */
import { useAnalyze } from '../analysis/use-analyze';
import { useGrammars } from '../analysis/use-grammars';
import { useEffect } from 'react';
import { ResultPanel } from '../components/result-panel/ResultPanel';
import { GrammarPanel } from '../components/grammar-panel/GrammarPanel';
import { SequenceInput } from '../components/sequence-input/SequenceInput';
import { MutedText } from '../components/ui/MutedText';
import { Panel } from '../components/ui/Panel';
import { EXAMPLES } from '../domain/examples';
import type { ViewProps } from '../state/app-state';

export function AnalysisView({ state, dispatch }: ViewProps) {
  const catalog = useGrammars();
  const genre = catalog?.genres.find((each) => each.id === state.genreId);
  const grammar = catalog?.grammars.find((each) => each.id === state.grammarId);
  const { result, isAnalyzing, analyze, analyzedInput } = useAnalyze();

  // Another grammar gives another analysis: redo the last one with the new grammar.
  useEffect(() => {
    if (analyzedInput !== null) {
      analyze(state.grammarId, analyzedInput);
    }
    // Only when the grammar changes; the input changes are analyzed on demand.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.grammarId]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Entrada">
          {genre === undefined ? (
            <MutedText>Cargando las gramáticas…</MutedText>
          ) : (
            <SequenceInput
              tags={genre.tags}
              value={state.input}
              examples={EXAMPLES}
              onChange={(input) => {
                dispatch({ type: 'set-input', input });
              }}
              onAnalyze={() => {
                analyze(state.grammarId, state.input);
              }}
            />
          )}
        </Panel>
        <Panel title="Gramática">
          {catalog === null ? (
            <MutedText>Cargando las gramáticas…</MutedText>
          ) : (
            <GrammarPanel
              catalog={catalog}
              genreId={state.genreId}
              grammarId={state.grammarId}
              onSelect={(choice) => {
                dispatch({ type: 'select-grammar', ...choice });
              }}
            />
          )}
        </Panel>
      </div>
      <Panel title="Resultado">
        <ResultPanel
          result={result}
          isAnalyzing={isAnalyzing}
          alphabet={new Set(grammar?.alphabet)}
          selectedTree={state.selectedTree}
          collapseEpsilon={state.collapseEpsilon}
          onSelectTree={(index) => {
            dispatch({ type: 'select-tree', index });
          }}
          onToggleCollapseEpsilon={() => {
            dispatch({ type: 'toggle-collapse-epsilon' });
          }}
        />
      </Panel>
    </div>
  );
}
