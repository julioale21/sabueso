/**
 * Concept: the conversion to Chomsky normal form, step by step: the grammar after each step,
 * with the productions that step added and removed. With --until, it stops at that step.
 * Reference: Hopcroft 7.1; Augusto 2.4.3.
 * Card: docs/concepts/22-chomsky-normal-form.md
 */
import { addNewStart } from '../../chomsky-normal-form/add-new-start.js';
import { removeEpsilonProductions } from '../../chomsky-normal-form/remove-epsilon-productions.js';
import { removeUnitProductions } from '../../chomsky-normal-form/remove-unit-productions.js';
import { productionKey } from '../../chomsky-normal-form/rewrite.js';
import { formatProduction } from '../../grammar/build.js';
import type { Grammar, Production } from '../../grammar/types.js';
import { parseArguments } from '../arguments.js';
import { formatGrammar } from '../format.js';
import {
  GRAMMAR_FILE_OPTION,
  GRAMMAR_OPTION,
  readGrammar,
  resolveGrammarOption,
} from '../grammar-source.js';
import { EXIT_CODES, reportUsageError, type Command } from '../types.js';

/** One step of the conversion: its name as in the theory, what it does, and the function. */
interface ConversionStep {
  name: string;
  summary: string;
  apply: (grammar: Grammar) => Grammar;
  /** Why the step changed nothing, when it returns the same grammar. */
  unchangedReason?: (grammar: Grammar) => string;
}

/** The steps implemented so far, in the order of section 3.23. */
const CONVERSION_STEPS: readonly ConversionStep[] = [
  {
    name: 'START',
    summary: 'a new start symbol S0 → S, if S appears on some right side',
    apply: addNewStart,
    unchangedReason: (grammar) =>
      `${grammar.start} appears on no right side: it stays as the start symbol, no S0 is needed`,
  },
  {
    name: 'DEL',
    summary: 'remove the ε-productions (S → ε stays for the start symbol if ε ∈ L(G))',
    apply: removeEpsilonProductions,
  },
  {
    name: 'UNIT',
    summary: 'remove the unit productions A → B, using the unit pairs',
    apply: removeUnitProductions,
  },
];

const UNTIL_OPTION = '--until';
const STEP_NAMES = CONVERSION_STEPS.map((step) => step.name);
const CHOMSKY_NORMAL_FORM_USAGE = `sabueso chomsky-normal-form ${GRAMMAR_OPTION} <grammar> | ${GRAMMAR_FILE_OPTION} <path> [${UNTIL_OPTION} ${STEP_NAMES.join('|')}]`;

export const chomskyNormalFormCommand: Command = {
  name: 'chomsky-normal-form',
  description: `Convert a grammar to Chomsky normal form step by step (${STEP_NAMES.join(', ')})`,
  usage: CHOMSKY_NORMAL_FORM_USAGE,
  async run(commandArguments, environment) {
    const parsed = parseArguments(commandArguments, {
      flags: [],
      valueOptions: [GRAMMAR_OPTION, GRAMMAR_FILE_OPTION, UNTIL_OPTION],
    });
    if (typeof parsed === 'string') {
      return reportUsageError(parsed, environment);
    }
    const source = resolveGrammarOption(parsed, CHOMSKY_NORMAL_FORM_USAGE);
    if (typeof source === 'string') {
      return reportUsageError(source, environment);
    }
    if (parsed.positionals.length > 0) {
      return reportUsageError(`Usage: ${CHOMSKY_NORMAL_FORM_USAGE}`, environment);
    }
    const until = (parsed.values.get(UNTIL_OPTION) ?? STEP_NAMES.at(-1) ?? '').toUpperCase();
    const lastStep = STEP_NAMES.indexOf(until);
    if (lastStep === -1) {
      return reportUsageError(
        `${UNTIL_OPTION} must be one of: ${STEP_NAMES.join(', ')}`,
        environment,
      );
    }
    const grammar = await readGrammar(source, environment);
    const sections = [`${grammar.name}: conversion to Chomsky normal form`];
    let current = grammar;
    CONVERSION_STEPS.slice(0, lastStep + 1).forEach((step, index) => {
      const next = step.apply(current);
      sections.push(formatStep(index + 1, step, current, next));
      current = next;
    });
    environment.writeOutput(`${sections.join('\n\n')}\n`);
    return EXIT_CODES.ok;
  },
};

/** The title of the step, the productions it added and removed, and the grammar it left. */
function formatStep(number: number, step: ConversionStep, before: Grammar, after: Grammar): string {
  const title = `Step ${number} · ${step.name}: ${step.summary}`;
  if (after === before && step.unchangedReason !== undefined) {
    return [title, `Nothing to do: ${step.unchangedReason(before)}`].join('\n');
  }
  const added = difference(after.productions, before.productions);
  const removed = difference(before.productions, after.productions);
  return [
    title,
    formatChanges('Added', '+', added),
    formatChanges('Removed', '-', removed),
    `After ${step.name} (${after.productions.length} productions):`,
    formatGrammar(after),
  ].join('\n');
}

/** 'Added (2):' and one '+ A → α' per production, or 'Added: none'. */
function formatChanges(title: string, mark: string, productions: readonly Production[]): string {
  if (productions.length === 0) {
    return `${title}: none`;
  }
  return [
    `${title} (${productions.length}):`,
    ...productions.map((production) => `  ${mark} ${formatProduction(production)}`),
  ].join('\n');
}

/** The productions of the first list that the second one does not have, compared by symbols. */
function difference(
  productions: readonly Production[],
  others: readonly Production[],
): Production[] {
  const otherKeys = new Set(others.map(productionKey));
  return productions.filter((production) => !otherKeys.has(productionKey(production)));
}
