/**
 * Concept: where a command takes the story from: the words on the command line, or a text
 * file given with --file (L1 has 200 events, too many to type).
 * Reference: SPEC 02, section 8.2.
 */
import type { SymbolName } from '../grammar/types.js';
import { tokenizeSequence } from '../input/sequence.js';
import type { ParsedArguments } from './arguments.js';
import type { CommandLineEnvironment } from './types.js';

/** The option that reads the story from a file instead of the command line. */
export const FILE_OPTION = '--file';

/** The story to analyze, as tokens, and how to name it in the output. */
export interface Story {
  tokens: SymbolName[];
  /** 'CRI PIS REV', or '200 events from l1.txt' for a file. */
  label: string;
}

/**
 * Reads the story: from the --file if there is one, otherwise from the positional words.
 * Returns a usage message if both are given.
 */
export async function readStory({
  parsed,
  environment,
}: {
  parsed: ParsedArguments;
  environment: CommandLineEnvironment;
}): Promise<Story | string> {
  const path = parsed.values.get(FILE_OPTION);
  if (path === undefined) {
    const tokens = tokenizeSequence(parsed.positionals.join(' '));
    return { tokens, label: tokens.length === 0 ? '(empty input)' : tokens.join(' ') };
  }
  if (parsed.positionals.length > 0) {
    return `Give the story either as words or with ${FILE_OPTION}, not both`;
  }
  const tokens = tokenizeSequence(await readStoryFile({ path, environment }));
  return { tokens, label: `${tokens.length} events from ${path}` };
}

/** Reads a --file, turning a missing file into a clear message. */
async function readStoryFile({
  path,
  environment,
}: {
  path: string;
  environment: CommandLineEnvironment;
}): Promise<string> {
  try {
    return await environment.readFile(path);
  } catch {
    throw new Error(`Cannot read the story file "${path}"`);
  }
}
