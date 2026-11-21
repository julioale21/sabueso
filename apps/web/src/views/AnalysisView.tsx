/**
 * The main view: the story, and its analysis (SPEC 03, sections 3.1 and 3.4). Concepts: the
 * alphabet and a string over it (card 01); the result arrives in step 9 (cards 17 to 21).
 */
import { useGrammars } from '../analysis/use-grammars';
import { SequenceInput } from '../components/sequence-input/SequenceInput';
import { Panel } from '../components/ui/Panel';
import { EXAMPLES } from '../domain/examples';
import type { AppAction, AppState } from '../state/app-state';

export function AnalysisView({
  state,
  dispatch,
}: {
  state: AppState;
  dispatch: (action: AppAction) => void;
}) {
  const catalog = useGrammars();
  const genre = catalog?.genres.find((each) => each.id === state.genreId);

  return (
    <div className="space-y-4">
      <Panel title="Entrada">
        {genre === undefined ? (
          <p className="text-sm text-slate-500">Cargando las gramáticas…</p>
        ) : (
          <SequenceInput
            tags={genre.tags}
            value={state.input}
            examples={EXAMPLES}
            onChange={(input) => {
              dispatch({ type: 'set-input', input });
            }}
            onAnalyze={() => {
              // The result panel arrives in step 9 (SPEC 03).
            }}
          />
        )}
      </Panel>
      <Panel title="Resultado">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          El veredicto, el árbol y la derivación llegan en el paso 9 del SPEC 03.
        </p>
      </Panel>
    </div>
  );
}
