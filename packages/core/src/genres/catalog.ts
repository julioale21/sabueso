/**
 * Concept: the catalog of genres the program can identify. Data only: the engine does not
 * import it. Adding a genre means adding its grammars, its tags and one entry here.
 * Reference: SPEC 02, section 4.6.
 */
import { detectiveTags } from './detective-tags.js';
import type { Genre } from './types.js';

export const genres: readonly Genre[] = [
  {
    id: 'detective',
    name: 'Policial de enigma',
    description:
      'A crime, an investigation with clues and suspicions, and the reveal of the culprit.',
    officialGrammar: 'detective/g1',
    alternativeGrammar: 'detective/g0',
    tags: detectiveTags,
  },
];
