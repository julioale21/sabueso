/**
 * The main view: the story, and its analysis (SPEC 03, sections 3.1 and 3.4). Concepts: the
 * alphabet and a string over it (card 01), the grammar and its analysis (cards 02 and 06 to
 * 10); the result arrives in step 9 (cards 17 to 21).
 */
import { useAnalyze } from '../analysis/use-analyze';
import { useGrammars } from '../analysis/use-grammars';
import { ResultPreview } from '../components/ResultPreview';
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
  const { result, analyze } = useAnalyze();

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
        <ResultPreview
          result={result}
          alphabet={new Set(grammar?.alphabet)}
          collapseEpsilon={state.collapseEpsilon}
        />
      </Panel>
    </div>
  );
}
