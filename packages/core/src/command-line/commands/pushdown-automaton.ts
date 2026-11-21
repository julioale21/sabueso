/**
 * Concept: the pushdown automaton of a grammar, run on a story: the result, how many
 * configurations the search explored, and the accepting path as a table of instantaneous
 * descriptions (input left, stack). With --transitions, δ itself.
 * Card: docs/concepts/24-pushdown-automaton.md
 */
import { formatProduction } from '../../grammar/build.js';
import type { SymbolName } from '../../grammar/types.js';
import { checkAlphabet, tokenizeSequence } from '../../input/sequence.js';
import {
  buildPushdownAutomaton,
  type PushdownAutomaton,
  type PushdownTransition,
} from '../../pushdown-automaton/build.js';
import {
  simulatePushdownAutomaton,
  type PathStep,
  type PushdownRun,
} from '../../pushdown-automaton/simulate.js';
import { formatRejection, formatTable } from '../format.js';
import {
  GRAMMAR_FILE_OPTION,
  GRAMMAR_OPTION,
  readGrammar,
  readGrammarCommandArguments,
} from '../grammar-source.js';
import { EXIT_CODES, type Command } from '../types.js';

const TRANSITIONS_FLAG = '--transitions';
const PUSHDOWN_USAGE = `sabueso pushdown-automaton ${GRAMMAR_OPTION} <grammar> | ${GRAMMAR_FILE_OPTION} <path> [${TRANSITIONS_FLAG}] "<story>"`;

export const pushdownAutomatonCommand: Command = {
  name: 'pushdown-automaton',
  description:
    'Run the pushdown automaton of the grammar on a story: result and accepting path (--transitions: δ)',
  usage: PUSHDOWN_USAGE,
  async run({ commandArguments, environment }) {
    const input = readGrammarCommandArguments({
      commandArguments,
      rules: { flags: [TRANSITIONS_FLAG], valueOptions: [GRAMMAR_OPTION, GRAMMAR_FILE_OPTION] },
      usage: PUSHDOWN_USAGE,
      environment,
    });
    if (typeof input === 'number') {
      return input;
    }
    const { parsed, source } = input;
    const grammar = await readGrammar({ source, environment });
    const tokens = tokenizeSequence(parsed.positionals.join(' '));
    const title = `${grammar.name}: pushdown automaton on ${tokens.length === 0 ? '(empty input)' : tokens.join(' ')}`;
    const unknown = checkAlphabet({ tokens, grammar });
    if (unknown !== null) {
      environment.writeOutput(`${title}\n\n${formatRejection(unknown)}\n`);
      return EXIT_CODES.rejected;
    }
    const automaton = buildPushdownAutomaton(grammar);
    const run = simulatePushdownAutomaton({ grammar, tokens });
    const sections = [title, formatAutomaton(automaton)];
    if (parsed.flags.has(TRANSITIONS_FLAG)) {
      sections.push(formatTransitions(automaton));
    }
    sections.push(formatResult(run));
    if (run.acceptingPath !== null) {
      sections.push(formatPath({ path: run.acceptingPath, tokens }));
    }
    environment.writeOutput(`${sections.join('\n\n')}\n`);
    return run.result === 'accept' ? EXIT_CODES.ok : EXIT_CODES.rejected;
  },
};

/** P = ({q}, Σ, Γ, δ, q, S) and the sizes of Σ, Γ and δ. */
function formatAutomaton(automaton: PushdownAutomaton): string {
  const expansions = automaton.transitions.filter((transition) => transition.kind === 'expand');
  return [
    `P = ({q}, Σ, Γ, δ, q, ${automaton.startStack}), accepting by empty stack`,
    `|Σ| = ${automaton.inputAlphabet.size}, |Γ| = ${automaton.stackAlphabet.size} (N ∪ Σ), |δ| = ${automaton.transitions.length} (${expansions.length} expand, ${automaton.transitions.length - expansions.length} match)`,
  ].join('\n');
}

/** δ, one line per transition: 'δ(q, ε, A) ∋ (q, β)   (n)' or 'δ(q, a, a) = {(q, ε)}'. */
function formatTransitions(automaton: PushdownAutomaton): string {
  return [
    'Transitions:',
    ...automaton.transitions.map((transition) =>
      transition.kind === 'expand'
        ? `  δ(q, ε, ${transition.top}) ∋ (q, ${transition.push.join(' ') || 'ε'})   (${transition.production.id})`
        : `  δ(q, ${transition.terminal}, ${transition.terminal}) = {(q, ε)}`,
    ),
  ].join('\n');
}

/** The verdict and how many configurations the search explored. */
function formatResult(run: PushdownRun): string {
  const explored = `${run.steps} ${run.steps === 1 ? 'configuration' : 'configurations'} explored`;
  if (run.result === 'accept') {
    return `ACCEPTED: the stack is empty after the whole input · ${explored}`;
  }
  if (run.result === 'reject') {
    return `REJECTED: no branch empties the stack at the end of the input · ${explored}`;
  }
  return `UNDETERMINED: the search stopped at its limit · ${explored}`;
}

/** The accepting path as a table of instantaneous descriptions, top of the stack first. */
function formatPath({
  path,
  tokens,
}: {
  path: readonly PathStep[];
  tokens: readonly SymbolName[];
}): string {
  const expansions = path.filter((step) => step.via?.kind === 'expand').length;
  const rows = path.map((step, index) => [
    String(index),
    tokens.slice(step.id.position).join(' ') || 'ε',
    step.id.stack.join(' ') || 'ε',
    describeTransition(step.via),
  ]);
  return [
    `Accepting path (${path.length - 1} transitions: ${expansions} expand, ${path.length - 1 - expansions} match):`,
    formatTable({ header: ['Step', 'Input left', 'Stack', 'Transition'], rows }),
  ].join('\n');
}

/** 'expand (0) Relato → Planteo Investigacion Desenlace', 'match CRI', or '— (start)'. */
function describeTransition(transition: PushdownTransition | null): string {
  if (transition === null) {
    return '— (start)';
  }
  return transition.kind === 'expand'
    ? `expand (${transition.production.id}) ${formatProduction(transition.production)}`
    : `match ${transition.terminal}`;
}
