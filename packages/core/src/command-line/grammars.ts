/**
 * Concept: where a command takes its grammar from: a built-in grammar by name, or a .grammar
 * file given with --grammar-file (to try the generic engine on any grammar).
 * Reference: SPEC 02, section 8.2.
 *
 * Built-in grammars come in two groups: the grammars of each genre (read from the catalog,
 * so a new genre needs no change here) and the internal grammars for development.
 */
import { genres } from '../genres/catalog.js';
import type { Genre } from '../genres/types.js';
import type { ParsedArguments } from './arguments.js';
import type { CommandLineEnvironment } from './types.js';

/** The two groups of built-in grammars. The names are shown to the user, in Spanish. */
export type GrammarGroup = 'Géneros' | 'Desarrollo';

export interface BuiltInGrammar {
  /** The name typed on the command line, e.g. 'detective/g1' or 'arithmetic'. */
  id: string;
  /** Shorter names for the same grammar, e.g. 'g1'. */
  aliases: readonly string[];
  group: GrammarGroup;
  /** One line, shown by the `grammars` command. */
  description: string;
  /** Where the .grammar file is, relative to this module (src/ and dist/ have the same depth). */
  location: URL;
}

/** A grammar chosen on the command line: by name, or by the path of a file. */
export type GrammarSource =
  { kind: 'built-in'; grammar: BuiltInGrammar } | { kind: 'file'; path: string };

/** The text of a grammar and the label that names it in the output. */
export interface GrammarText {
  label: string;
  text: string;
}

/** The option that reads a grammar from a file instead of a built-in name. */
export const GRAMMAR_FILE_OPTION = '--grammar-file';

/** Short names for the grammars of the detective story, to shorten the commands. */
const aliases: Readonly<Record<string, readonly string[]>> = {
  'detective/g1': ['g1'],
  'detective/g0': ['g0'],
};

/** The internal grammars: the format itself, textbook grammars and analysis cases. */
const developmentGrammars: readonly BuiltInGrammar[] = [
  developmentGrammar('meta', 'meta.grammar', 'The grammar of the .grammar format (LL(1))'),
  developmentGrammar(
    'arithmetic-ambiguous',
    'test/arithmetic-ambiguous.grammar',
    'E → E + E | E * E | ( E ) | id: ambiguous',
  ),
  developmentGrammar(
    'arithmetic',
    'test/arithmetic.grammar',
    'Arithmetic with precedence: unambiguous, left-recursive',
  ),
  developmentGrammar('parentheses', 'test/parentheses.grammar', 'Balanced parentheses, with ε'),
  developmentGrammar(
    'epsilon-trap',
    'test/epsilon-trap.grammar',
    'S → A A x, A → ε: the case that breaks classic Earley',
  ),
  developmentGrammar(
    'test-useless',
    'test/useless.grammar',
    'Useless symbols: A is not productive, C is not reachable',
  ),
  developmentGrammar('test-empty', 'test/empty.grammar', 'An empty language: L(G) = ∅'),
  developmentGrammar('test-cyclic', 'test/cyclic.grammar', 'A cycle S ⇒ A ⇒ S'),
];

const builtInGrammars: readonly BuiltInGrammar[] = [
  ...genres.flatMap(genreGrammars),
  ...developmentGrammars,
];

function developmentGrammar(id: string, file: string, description: string): BuiltInGrammar {
  return {
    id,
    aliases: [],
    group: 'Desarrollo',
    description,
    location: new URL(`../../grammars/${file}`, import.meta.url),
  };
}

/** The official and alternative grammars of a genre, at grammars/genres/<grammar id>.grammar. */
function genreGrammars(genre: Genre): BuiltInGrammar[] {
  const official = genreGrammar(genre.officialGrammar, `${genre.name}: official grammar`);
  const alternative =
    genre.alternativeGrammar === undefined
      ? []
      : [genreGrammar(genre.alternativeGrammar, `${genre.name}: alternative grammar`)];
  return [official, ...alternative];
}

function genreGrammar(id: string, description: string): BuiltInGrammar {
  return {
    id,
    aliases: aliases[id] ?? [],
    group: 'Géneros',
    description,
    location: new URL(`../../grammars/genres/${id}.grammar`, import.meta.url),
  };
}

/** Every built-in grammar, genres first. */
export function listBuiltInGrammars(): readonly BuiltInGrammar[] {
  return builtInGrammars;
}

/** The names of every built-in grammar, for help and error messages. */
export function builtInGrammarIds(): string[] {
  return builtInGrammars.map((grammar) => grammar.id);
}

/** The grammar with that name or alias, e.g. 'detective/g1' or 'g1'. */
export function findBuiltInGrammar(name: string): BuiltInGrammar | undefined {
  return builtInGrammars.find((grammar) => grammar.id === name || grammar.aliases.includes(name));
}

/** The built-in grammars by group, for help: 'Géneros: detective/g1 (g1), detective/g0 (g0)'. */
export function formatGrammarGroups(): string {
  const groups: GrammarGroup[] = ['Géneros', 'Desarrollo'];
  const lines = groups.map((group) => {
    const names = builtInGrammars.filter((grammar) => grammar.group === group).map(nameWithAliases);
    return `  ${group}: ${names.join(', ')}`;
  });
  return ['Grammars:', ...lines].join('\n');
}

function nameWithAliases(grammar: BuiltInGrammar): string {
  return grammar.aliases.length === 0
    ? grammar.id
    : `${grammar.id} (${grammar.aliases.join(', ')})`;
}

/** The file system path of a built-in grammar. */
export function builtInGrammarPath(grammar: BuiltInGrammar): string {
  return decodeURIComponent(grammar.location.pathname);
}

/**
 * Chooses the grammar from the parsed arguments: exactly one built-in name or one
 * --grammar-file. Returns the message of a usage error otherwise.
 */
export function resolveGrammarSource(
  parsed: ParsedArguments,
  usage: string,
): GrammarSource | string {
  const path = parsed.values.get(GRAMMAR_FILE_OPTION);
  const [id, ...extra] = parsed.positionals;
  if (extra.length > 0 || (path === undefined) === (id === undefined)) {
    return `Usage: ${usage}`;
  }
  if (path !== undefined) {
    return { kind: 'file', path };
  }
  const grammar = findBuiltInGrammar(id ?? '');
  return grammar === undefined ? unknownGrammarMessage(id ?? '') : { kind: 'built-in', grammar };
}

function unknownGrammarMessage(id: string): string {
  return `Unknown grammar: ${id}. Available grammars: ${builtInGrammarIds().join(', ')}`;
}

/** Reads the text of the chosen grammar through the injected environment. */
export async function readGrammarSource(
  source: GrammarSource,
  environment: CommandLineEnvironment,
): Promise<GrammarText> {
  if (source.kind === 'built-in') {
    const text = await environment.readFile(builtInGrammarPath(source.grammar));
    return { label: source.grammar.id, text };
  }
  return { label: source.path, text: await readUserFile(source.path, environment) };
}

async function readUserFile(path: string, environment: CommandLineEnvironment): Promise<string> {
  try {
    return await environment.readFile(path);
  } catch {
    throw new Error(`Cannot read the grammar file "${path}"`);
  }
}
