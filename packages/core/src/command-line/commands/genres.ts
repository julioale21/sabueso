/**
 * Concept: the genres the program can identify, each one a language over its own tags.
 * Reference: SPEC 02, section 4.6.
 * Card: docs/concepts/01-alphabet-and-language.md
 */
import { genres } from '../../genres/catalog.js';
import type { Genre } from '../../genres/types.js';
import { table } from '../format.js';
import { findBuiltInGrammar } from '../grammars.js';
import { EXIT_CODES, type Command } from '../types.js';

export const genresCommand: Command = {
  name: 'genres',
  description: 'List the genres of the catalog, with their grammars and tags',
  usage: 'sabueso genres',
  run(commandArguments, environment) {
    if (commandArguments.length > 0) {
      environment.writeError('Usage: sabueso genres\n');
      return Promise.resolve(EXIT_CODES.usage);
    }
    environment.writeOutput(`${genres.map(formatGenre).join('\n\n')}\n`);
    return Promise.resolve(EXIT_CODES.ok);
  },
};

function formatGenre(genre: Genre): string {
  const grammars = [`Official grammar:    ${grammarName(genre.officialGrammar)}`];
  if (genre.alternativeGrammar !== undefined) {
    grammars.push(`Alternative grammar: ${grammarName(genre.alternativeGrammar)}`);
  }
  return [
    `${genre.id}: ${genre.name}`,
    genre.description,
    '',
    ...grammars,
    '',
    `Tags (|Σ| = ${genre.tags.length}):`,
    '',
    table(
      ['Tag', 'Function', 'Example'],
      genre.tags.map((tag) => [tag.tag, tag.narrativeFunction, tag.example]),
    ),
  ].join('\n');
}

/** 'detective/g1 (g1)': the grammar id with its aliases. */
function grammarName(id: string): string {
  const aliases = findBuiltInGrammar(id)?.aliases ?? [];
  return aliases.length === 0 ? id : `${id} (${aliases.join(', ')})`;
}
