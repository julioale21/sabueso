/**
 * Concept: where a command takes its grammar from: a built-in grammar by name, or a .grammar
 * file given with --grammar-file (to try the generic engine on any grammar).
 */
import { parseGrammarText } from '../grammar-format/parser.js';
import type { Grammar } from '../grammar/types.js';
import { parseArguments, type ArgumentRules, type ParsedArguments } from './arguments.js';
import {
  builtInGrammarIds,
  builtInGrammarPath,
  findBuiltInGrammar,
  type BuiltInGrammar,
} from './built-in-grammars.js';
import { reportUsageError, type CommandLineEnvironment } from './types.js';

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

/**
 * The option that names a built-in grammar, for commands whose positional arguments are a
 * story: `tokens --grammar g1 "CRI PIS REV"`.
 */
export const GRAMMAR_OPTION = '--grammar';

/**
 * Chooses the grammar from the parsed arguments: exactly one built-in name (positional) or one
 * --grammar-file. Returns the message of a usage error otherwise.
 */
export function resolveGrammarSource({
  parsed,
  usage,
}: {
  parsed: ParsedArguments;
  usage: string;
}): GrammarSource | string {
  const [name, ...extra] = parsed.positionals;
  if (extra.length > 0) {
    return `Usage: ${usage}`;
  }
  return chooseGrammarSource({ name, path: parsed.values.get(GRAMMAR_FILE_OPTION), usage });
}

/**
 * Like resolveGrammarSource, for the commands that read a story: the name comes with --grammar,
 * because the positional arguments are the story.
 */
export function resolveGrammarOption({
  parsed,
  usage,
}: {
  parsed: ParsedArguments;
  usage: string;
}): GrammarSource | string {
  return chooseGrammarSource({
    name: parsed.values.get(GRAMMAR_OPTION),
    path: parsed.values.get(GRAMMAR_FILE_OPTION),
    usage,
  });
}

/** Exactly one of the two: a built-in name or the path of a file. */
function chooseGrammarSource({
  name,
  path,
  usage,
}: {
  name?: string | undefined;
  path?: string | undefined;
  usage: string;
}): GrammarSource | string {
  if ((path === undefined) === (name === undefined)) {
    return `Usage: ${usage}`;
  }
  if (path !== undefined) {
    return { kind: 'file', path };
  }
  const grammar = findBuiltInGrammar(name ?? '');
  return grammar === undefined ? unknownGrammarMessage(name ?? '') : { kind: 'built-in', grammar };
}

/** What a command that reads a grammar gets from its arguments, once they are valid. */
export interface GrammarCommandArguments {
  parsed: ParsedArguments;
  source: GrammarSource;
}

/**
 * The start every command with --grammar or --grammar-file repeats: parse the arguments,
 * choose the grammar and, for the commands that take no story, reject leftover arguments.
 * Returns the arguments and the source, or the exit code of the usage error it reported.
 * It does not read the grammar: each command still checks its own options first, so the
 * order of its error messages stays the same.
 */
export function readGrammarCommandArguments({
  commandArguments,
  rules,
  usage,
  environment,
  allowsPositionals = true,
}: {
  commandArguments: readonly string[];
  rules: ArgumentRules;
  usage: string;
  environment: CommandLineEnvironment;
  /** False for the commands that take nothing but options. */
  allowsPositionals?: boolean;
}): GrammarCommandArguments | number {
  const parsed = parseArguments({ commandArguments, rules });
  if (typeof parsed === 'string') {
    return reportUsageError({ message: parsed, environment });
  }
  const source = resolveGrammarOption({ parsed, usage });
  if (typeof source === 'string') {
    return reportUsageError({ message: source, environment });
  }
  if (!allowsPositionals && parsed.positionals.length > 0) {
    return reportUsageError({ message: `Usage: ${usage}`, environment });
  }
  return { parsed, source };
}

/** A built-in grammar by name, or the usage error that lists the valid names. */
export function builtInGrammarSource(name: string): GrammarSource | string {
  const grammar = findBuiltInGrammar(name);
  return grammar === undefined ? unknownGrammarMessage(name) : { kind: 'built-in', grammar };
}

/** The usage error for a name that is not a built-in grammar, with the valid names. */
function unknownGrammarMessage(id: string): string {
  return `Unknown grammar: ${id}. Available grammars: ${builtInGrammarIds().join(', ')}`;
}

/** Reads the text of the chosen grammar through the injected environment. */
export async function readGrammarSource({
  source,
  environment,
}: {
  source: GrammarSource;
  environment: CommandLineEnvironment;
}): Promise<GrammarText> {
  if (source.kind === 'built-in') {
    const text = await environment.readFile(builtInGrammarPath(source.grammar));
    return { label: source.grammar.id, text };
  }
  return { label: source.path, text: await readUserFile({ path: source.path, environment }) };
}

/** Reads the chosen grammar and builds it with the whole chain: lexer → parser → buildGrammar. */
export async function readGrammar({
  source,
  environment,
}: {
  source: GrammarSource;
  environment: CommandLineEnvironment;
}): Promise<Grammar> {
  const { label, text } = await readGrammarSource({ source, environment });
  return parseGrammarText({ text, name: label });
}

/** Reads a --grammar-file, turning a missing file into a clear message. */
async function readUserFile({
  path,
  environment,
}: {
  path: string;
  environment: CommandLineEnvironment;
}): Promise<string> {
  try {
    return await environment.readFile(path);
  } catch {
    throw new Error(`Cannot read the grammar file "${path}"`);
  }
}
