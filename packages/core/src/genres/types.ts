/**
 * Concept: a genre is a language L(G) over its own alphabet of narrative tags.
 * Reference: SPEC 02, section 4.6.
 * Card: docs/concepts/01-alphabet-and-language.md
 */

/** One tag of a genre: a terminal of its grammar, with its narrative meaning. */
export interface TagInfo {
  /** The terminal, e.g. 'CRI'. */
  tag: string;
  /** What the tag means in the story, e.g. 'Crimen'. */
  narrativeFunction: string;
  /** An event of a story that gets this tag. */
  example: string;
}

/** A genre the program can identify: its tags and the grammars that describe it. */
export interface Genre {
  /** Used in grammar ids: 'detective' gives 'detective/g1'. */
  id: string;
  /** The name shown to the user, e.g. 'Policial de enigma'. */
  name: string;
  description: string;
  /** The grammar that decides whether a story belongs to the genre, e.g. 'detective/g1'. */
  officialGrammar: string;
  /** Another grammar of the same genre, for comparisons (G0, the ambiguous one). */
  alternativeGrammar?: string;
  /** The alphabet Σ of the genre, with the meaning of each tag. */
  tags: readonly TagInfo[];
}
