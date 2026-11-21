/** Two levels: the genre of the catalog and one of its grammars (SPEC 03, section 3.5). */
import type { Genre } from '@sabueso/core';
import type { GrammarId } from '../../analysis/service';
import { grammarOptionsOf } from '../../domain/grammar-options';
import { SelectField } from '../ui/SelectField';

export function GrammarSelect({
  genres,
  genreId,
  grammarId,
  onSelect,
}: {
  genres: readonly Genre[];
  genreId: string;
  grammarId: GrammarId;
  onSelect: (choice: { genreId: string; grammarId: GrammarId }) => void;
}) {
  const genre = genres.find((each) => each.id === genreId);
  return (
    <div className="flex flex-wrap gap-3">
      <SelectField
        label="Género"
        value={genreId}
        options={genres.map((each) => ({ value: each.id, label: each.name }))}
        onChange={(nextGenreId) => {
          const next = genres.find((each) => each.id === nextGenreId);
          if (next !== undefined) {
            onSelect({ genreId: next.id, grammarId: next.officialGrammar });
          }
        }}
      />
      {genre !== undefined && (
        <SelectField
          label="Gramática"
          value={grammarId}
          options={grammarOptionsOf(genre).map((option) => ({
            value: option.id,
            label: option.label,
          }))}
          onChange={(nextGrammarId) => {
            onSelect({ genreId, grammarId: nextGrammarId });
          }}
        />
      )}
    </div>
  );
}
