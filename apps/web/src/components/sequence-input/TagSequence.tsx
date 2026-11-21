/** The story as chips, so the words outside Σ stand out before analyzing. */
import { TagChip } from './TagChip';

/** Longer stories (L1 has 200 events) are not drawn as chips: they would fill the page. */
const MAX_CHIPS = 40;

export function TagSequence({
  words,
  alphabet,
}: {
  words: readonly string[];
  alphabet: ReadonlySet<string>;
}) {
  if (words.length === 0 || words.length > MAX_CHIPS) {
    return null;
  }
  return (
    <ol aria-label="Etiquetas del relato" className="flex flex-wrap gap-1">
      {words.map((word, index) => (
        <TagChip key={`${index}-${word}`} word={word} isKnown={alphabet.has(word)} />
      ))}
    </ol>
  );
}
