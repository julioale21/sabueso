/**
 * The main view: the story, and its analysis (SPEC 03, sections 3.1 and 3.4). Concepts: the
 * alphabet and a string over it (guide 06), the grammar and its analysis (guides 02 and 07 to
 * 12), and the result: verdict, trees, derivation and diagnosis (guides 16 and 19 to 21).
 */
import { useGrammars } from '../analysis/use-grammars';
import { useEffect, useRef, useState } from 'react';
import { ResultPanel } from '../components/result-panel/ResultPanel';
import { GrammarPanel } from '../components/grammar-panel/GrammarPanel';
import { SequenceInput } from '../components/sequence-input/SequenceInput';
import { MutedText } from '../components/ui/MutedText';
import { Panel } from '../components/ui/Panel';
import { EXAMPLES } from '../domain/examples';
import type { ViewProps } from '../state/app-state';
import { cx } from '../utils/cx';

export function AnalysisView({ state, dispatch, analysis }: ViewProps) {
  const catalog = useGrammars();
  const genre = catalog?.genres.find((each) => each.id === state.genreId);
  const grammar = catalog?.grammars.find((each) => each.id === state.grammarId);
  const { result, isAnalyzing, runCount, reset } = analysis;
  const resultRef = useRef<HTMLDivElement>(null);
  // A result is new when it arrived after this view was mounted. Coming back to the tab shows
  // the last result as it was: no slide-in, no scrolling, no tree building itself again.
  const [runCountAtMount] = useState(runCount);
  const isNewResult = runCount > runCountAtMount;

  // Each new result: bring it into view (jsdom has no scrollIntoView).
  useEffect(() => {
    if (isNewResult) {
      resultRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    }
  }, [isNewResult, runCount]);

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
                  // The page analyzes when analysisRequest changes (App.tsx).
                  dispatch({ type: 'analyze' });
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
        // A new key per result replays the slide-in animation, only for a new result.
        <div
          key={runCount}
          ref={resultRef}
          className={cx('scroll-mt-4', isNewResult && 'motion-safe:animate-result-in')}
        >
          <Panel title="Resultado">
            <ResultPanel
              result={result}
              isNewResult={isNewResult}
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
