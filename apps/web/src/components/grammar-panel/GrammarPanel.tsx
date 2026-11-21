/**
 * The grammar the story is analyzed against (SPEC 03, section 3.5), folded into one line: the
 * selector and whether it is LL(1). Its analysis and its text, read-only, open on demand.
 * There is no way to load or edit a grammar.
 */
import { useState } from 'react';
import type { Catalog } from '../../analysis/use-grammars';
import type { GrammarId } from '../../analysis/service';
import { DisclosureButton } from '../ui/DisclosureButton';
import { GrammarSelect } from './GrammarSelect';
import { GrammarSummary } from './GrammarSummary';
import { GrammarText } from './GrammarText';
import { Ll1Badge } from './Ll1Badge';

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
  const [showsGrammar, setShowsGrammar] = useState(false);
  const grammar = catalog.grammars.find((each) => each.id === grammarId);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <GrammarSelect
          genres={catalog.genres}
          genreId={genreId}
          grammarId={grammarId}
          onSelect={onSelect}
        />
        {grammar !== undefined && (
          <Ll1Badge conflicts={grammar.analysis.predictiveTable.conflicts.length} />
        )}
        <DisclosureButton
          isOpen={showsGrammar}
          showLabel="Ver la gramática"
          hideLabel="Ocultar la gramática"
          onToggle={() => {
            setShowsGrammar((open) => !open);
          }}
        />
      </div>
      {showsGrammar && grammar !== undefined && (
        <>
          <GrammarSummary analysis={grammar.analysis} />
          <GrammarText text={grammar.text} />
        </>
      )}
    </div>
  );
}
