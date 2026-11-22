/**
 * FIRST, FOLLOW and the LL(1) predictive table of the active grammar (SPEC 03, section 3.4):
 * why G1 is unambiguous and where G0 fails. A property of the grammar, not of the story.
 * Concepts: guides 11 and 12.
 */
import { useGrammars } from '../analysis/use-grammars';
import { ConflictList } from '../components/ll1/ConflictList';
import { FirstFollowTable } from '../components/ll1/FirstFollowTable';
import { Ll1Verdict } from '../components/ll1/Ll1Verdict';
import { PredictiveTableView } from '../components/ll1/PredictiveTableView';
import { GrammarPropertyNote } from '../components/GrammarPropertyNote';
import { GrammarSelect } from '../components/grammar-panel/GrammarSelect';
import { grammarOptionsOf } from '../domain/grammar-options';
import { MutedText } from '../components/ui/MutedText';
import { Panel } from '../components/ui/Panel';
import type { ViewProps } from '../state/app-state';

/** The end-of-input marker, the extra column of the table. */
const END_OF_INPUT = '$';

export function Ll1View({ state, dispatch }: ViewProps) {
  const catalog = useGrammars();
  const grammar = catalog?.grammars.find((each) => each.id === state.grammarId);
  if (catalog === null || grammar === undefined) {
    return <MutedText>Cargando las gramáticas…</MutedText>;
  }
  const { analysis } = grammar;
  const genre = catalog.genres.find((each) => each.id === state.genreId);
  const grammarLabel =
    (genre && grammarOptionsOf(genre).find((option) => option.id === state.grammarId)?.label) ??
    state.grammarId;
  const nonterminals = [...analysis.first.keys()];
  return (
    <div className="space-y-4">
      <GrammarPropertyNote grammarLabel={grammarLabel} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <GrammarSelect
          genres={catalog.genres}
          genreId={state.genreId}
          grammarId={state.grammarId}
          onSelect={(choice) => {
            dispatch({ type: 'select-grammar', ...choice });
          }}
        />
        <Ll1Verdict conflicts={analysis.predictiveTable.conflicts.length} />
      </div>
      <Panel title="Tabla predictiva M[A, a]">
        <div className="space-y-3">
          <PredictiveTableView
            table={analysis.predictiveTable}
            nonterminals={nonterminals}
            terminals={[...grammar.alphabet, END_OF_INPUT]}
          />
          <ConflictList conflicts={analysis.predictiveTable.conflicts} />
        </div>
      </Panel>
      <Panel title="FIRST y FOLLOW">
        <FirstFollowTable
          nonterminals={nonterminals}
          first={analysis.first}
          follow={analysis.follow}
        />
      </Panel>
    </div>
  );
}
