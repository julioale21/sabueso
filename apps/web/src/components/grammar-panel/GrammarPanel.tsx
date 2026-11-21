/**
 * The grammar the story is analyzed against (SPEC 03, section 3.5): selector, summary of its
 * analysis and its text, read-only. There is no way to load or edit a grammar.
 */
import type { Catalog } from '../../analysis/use-grammars';
import type { GrammarId } from '../../analysis/service';
import { GrammarSelect } from './GrammarSelect';
import { GrammarSummary } from './GrammarSummary';
import { GrammarText } from './GrammarText';

export function GrammarPanel({
  catalog,
  genreId,
  grammarId,
  onSelect,
}: {
  catalog: Catalog;
  genreId: string;
  grammarId: GrammarId;
  onSelect: (choice: { genreId: string; grammarId: GrammarId }) => void;
}) {
  const grammar = catalog.grammars.find((each) => each.id === grammarId);
  return (
    <div className="space-y-3">
      <GrammarSelect
        genres={catalog.genres}
        genreId={genreId}
        grammarId={grammarId}
        onSelect={onSelect}
      />
      {grammar !== undefined && (
        <>
          <GrammarSummary analysis={grammar.analysis} />
          <GrammarText text={grammar.text} />
        </>
      )}
    </div>
  );
}
