/**
 * The main view: the story, and its analysis (SPEC 03, sections 3.1 and 3.4). Concepts: the
 * alphabet and a string over it (card 01), the grammar and its analysis (cards 02 and 06 to
 * 10); the result arrives in step 9 (cards 17 to 21).
 */
import { useAnalyze } from '../analysis/use-analyze';
import { useGrammars } from '../analysis/use-grammars';
import { useEffect, useRef } from 'react';
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
  const { result, isAnalyzing, runCount, analyze, reset } = useAnalyze();
  const resultRef = useRef<HTMLDivElement>(null);

  // Each new result: bring it into view (jsdom has no scrollIntoView).
  useEffect(() => {
    if (runCount > 0) {
      resultRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    }
  }, [runCount]);

  // Another grammar gives another analysis: redo the last one with the new grammar.
  useEffect(() => {
    if (state.analyzedInput !== null) {
      analyze(state.grammarId, state.analyzedInput);
    }
    // Only when the grammar changes; the input changes are analyzed on demand.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.grammarId]);

  return (
    <div className="space-y-4">
      {/* "Foco en el relato": the grammar it is analyzed against, the story, then the result. */}
      <div className="max-w-3xl">
        <Panel title="Relato">
          {catalog === null || genre === undefined ? (
            <MutedText>Cargando las gramáticas…</MutedText>
          ) : (
            <div className="space-y-4">
              <GrammarPanel
                catalog={catalog}
                genreId={state.genreId}
                grammarId={state.grammarId}
                onSelect={(choice) => {
                  dispatch({ type: 'select-grammar', ...choice });
                }}
              />
              <SequenceInput
                tags={genre.tags}
                value={state.input}
                examples={EXAMPLES}
                isAnalyzing={isAnalyzing}
                onChange={(input) => {
                  dispatch({ type: 'set-input', input });
                }}
                onAnalyze={() => {
                  dispatch({ type: 'analyze' });
                  analyze(state.grammarId, state.input);
                }}
                onClear={() => {
                  dispatch({ type: 'clear' });
                  reset();
                }}
              />
            </div>
          )}
        </Panel>
      </div>
      {result !== null && !isAnalyzing && (
        // A new key per result replays the slide-in animation.
        <div key={runCount} ref={resultRef} className="scroll-mt-4 motion-safe:animate-result-in">
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
      )}
    </div>
  );
}
