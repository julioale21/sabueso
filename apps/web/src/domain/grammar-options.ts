/** The versions of a genre that the grammar selector offers, with their labels. */
import type { Genre } from '@sabueso/core';
import type { GrammarId } from '../analysis/service';

export interface GrammarOption {
  id: GrammarId;
  /** 'G1 · oficial', 'G0 · alternativa'. */
  label: string;
}

/** 'detective/g1' → 'G1'. */
function shortName(id: GrammarId): string {
  return (id.split('/').at(-1) ?? id).toUpperCase();
}

/** The official grammar first, then the alternative one, if the genre has it. */
export function grammarOptionsOf(genre: Genre): GrammarOption[] {
  const official = {
    id: genre.officialGrammar,
    label: `${shortName(genre.officialGrammar)} · oficial`,
  };
  return genre.alternativeGrammar === undefined
    ? [official]
    : [
        official,
        {
          id: genre.alternativeGrammar,
          label: `${shortName(genre.alternativeGrammar)} · alternativa`,
        },
      ];
}
