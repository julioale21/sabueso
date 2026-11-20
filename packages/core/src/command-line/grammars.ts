/**
 * Concept: where a command takes its grammar from: a built-in grammar by name, or a .grammar
 * file given with --grammar-file (to try the generic engine on any grammar).
 * Reference: SPEC 02, section 8.2.
 *
 * First version (step 3): the only built-in grammar is `arithmetic`. Step 5 adds the others.
 */
import type { ParsedArguments } from './arguments.js';
import type { CommandLineEnvironment } from './types.js';

export interface BuiltInGrammar {
  /** The name typed on the command line, e.g. 'arithmetic'. */
  id: string;
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

const builtInGrammars: readonly BuiltInGrammar[] = [
  {
    id: 'arithmetic',
    location: new URL('../../grammars/test/arithmetic.grammar', import.meta.url),
  },
];

/** The names of every built-in grammar, for help and error messages. */
export function builtInGrammarIds(): string[] {
  return builtInGrammars.map((grammar) => grammar.id);
}

export function findBuiltInGrammar(id: string): BuiltInGrammar | undefined {
  return builtInGrammars.find((grammar) => grammar.id === id);
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
