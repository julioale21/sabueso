/**
 * Concept: the DFA lexer shown on a real grammar file: its tokens and, with --states, δ step by step.
 * Reference: Hopcroft 2.2; Augusto 1.3.
 * Card: docs/concepts/03-finite-automaton-lexer.md
 */
import type { AutomatonEvent } from '../../automata/deterministic-finite-automaton.js';
import { tokenizeGrammar, type LexerState, type Token } from '../../grammar-format/lexer.js';
import { parseArguments } from '../arguments.js';
import { formatTable } from '../format.js';
import {
  GRAMMAR_FILE_OPTION,
  readGrammarSource,
  resolveGrammarSource,
  type GrammarText,
} from '../grammar-source.js';
import {
  EXIT_CODES,
  reportUsageError,
  type Command,
  type CommandLineEnvironment,
} from '../types.js';

const STATES_FLAG = '--states';
const LEX_USAGE = `sabueso lex <grammar> | ${GRAMMAR_FILE_OPTION} <path> [${STATES_FLAG}]`;

export const lexCommand: Command = {
  name: 'lex',
  description: 'Split a grammar file into tokens with the DFA (--states: show δ step by step)',
  usage: LEX_USAGE,
  async run(commandArguments, environment) {
    const parsed = parseArguments(commandArguments, {
      flags: [STATES_FLAG],
      valueOptions: [GRAMMAR_FILE_OPTION],
    });
    if (typeof parsed === 'string') {
      return reportUsageError(parsed, environment);
    }
    const source = resolveGrammarSource(parsed, LEX_USAGE);
    if (typeof source === 'string') {
      return reportUsageError(source, environment);
    }
    const grammar = await readGrammarSource(source, environment);
    printLex(grammar, parsed.flags.has(STATES_FLAG), environment);
    return EXIT_CODES.ok;
  },
};

/** Prints the token table and, with --states, the trace of the first line with content. */
function printLex(
  grammar: GrammarText,
  showStates: boolean,
  environment: CommandLineEnvironment,
): void {
  const tokens = tokenizeGrammar(grammar.text);
  environment.writeOutput(`${grammar.label}: tokens\n\n${formatTokens(tokens)}\n`);
  if (showStates) {
    environment.writeOutput(`\n${formatFirstLineStates(grammar.text)}\n`);
  }
}

/** One row per token: its kind, its text and where it starts. */
function formatTokens(tokens: readonly Token[]): string {
  return formatTable(
    ['Token', 'Text', 'Line:column'],
    tokens.map((token) => [token.kind, token.text, `${token.line}:${token.column}`]),
  );
}

/** One row per lexeme of the line: what it read, the states it went through, the result. */
interface StatesRow {
  lexeme: string;
  states: string;
  result: string;
}

/**
 * Runs the DFA on the first line with content (the first line that is not blank or a
 * comment) and shows, for each lexeme, the path through δ.
 */
function formatFirstLineStates(text: string): string {
  const lines = text.split('\n');
  const index = lines.findIndex(isContentLine);
  const line = lines[index];
  if (line === undefined) {
    return 'DFA states: the file has no line to trace, only blank lines and comments';
  }
  const rows = traceLine(line);
  return [
    `DFA states for line ${index + 1}: ${line}`,
    '',
    formatTable(
      ['Lexeme', 'States', 'Result'],
      rows.map((row) => [row.lexeme, row.states, row.result]),
    ),
  ].join('\n');
}

/** A line that is not blank and not a comment: a rule or a directive. */
function isContentLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed !== '' && !trimmed.startsWith('#');
}

/** Collects the automaton events of one line and groups them by lexeme. */
function traceLine(line: string): StatesRow[] {
  const rows: StatesRow[] = [];
  let path = stateName('q0Start');
  tokenizeGrammar(`${line}\n`, (event: AutomatonEvent<LexerState, string>) => {
    if (event.type === 'transition') {
      path += ` ─${visible(event.character)}→ ${stateName(event.to)}`;
      return;
    }
    rows.push({
      lexeme: [...event.text].map(visible).join(''),
      states: path,
      result: event.kind ?? 'discarded',
    });
    path = stateName('q0Start');
  });
  return rows;
}

/** 'q3' for 'q3ArrowRead': the number of the state in the guide's graph, which starts its name. */
function stateName(state: LexerState): string {
  return /^q\d+/.exec(state)?.[0] ?? state;
}

/** Makes spaces and line breaks visible in the trace. */
function visible(character: string): string {
  if (character === ' ') return '␣';
  if (character === '\n') return '⏎';
  if (character === '\t') return '⇥';
  return character;
}
