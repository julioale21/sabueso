/**
 * Concept: the conversion to Chomsky normal form, step by step: the grammar after each step,
 * with the productions that step added and removed. With --until, it stops at that step.
 * Reference: Hopcroft 7.1; Augusto 2.4.3.
 * Card: docs/concepts/22-chomsky-normal-form.md
 */
import {
  CHOMSKY_NORMAL_FORM_STEPS,
  productionsOutsideChomskyNormalForm,
  type ChomskyNormalFormStep,
  type ChomskyNormalFormStepName,
} from '../../chomsky-normal-form/index.js';
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

/** How the console explains a step: what it does, and why it changed nothing, if it did not. */
interface StepDescription {
  summary: string;
  unchangedReason: (grammar: Grammar) => string;
}

/** The explanation of each step of section 3.23. */
const STEP_DESCRIPTIONS: Record<ChomskyNormalFormStepName, StepDescription> = {
  START: {
    summary: 'a new start symbol S0 → S, if S appears on some right side',
    unchangedReason: (grammar) =>
      `${grammar.start} appears on no right side: it stays as the start symbol, no S0 is needed`,
  },
  DEL: {
    summary: 'remove the ε-productions (S → ε stays for the start symbol if ε ∈ L(G))',
    unchangedReason: () => 'there is no ε-production',
  },
  UNIT: {
    summary: 'remove the unit productions A → B, using the unit pairs',
    unchangedReason: () => 'there is no unit production',
  },
  USELESS: {
    summary: 'remove the nonterminals that are not productive or not reachable',
    unchangedReason: () => 'every nonterminal is productive and reachable',
  },
  TERM: {
    summary: 'replace each terminal a by T_a → a in the right sides of length 2 or more',
    unchangedReason: () => 'no right side of length 2 or more has a terminal',
  },
  BIN: {
    summary: 'split each right side of length 3 or more into a chain X1, X2, … of length 2',
    unchangedReason: () => 'no right side is longer than 2',
  },
};

const UNTIL_OPTION = '--until';
const STEP_NAMES = CHOMSKY_NORMAL_FORM_STEPS.map((step) => step.name);
const CHOMSKY_NORMAL_FORM_USAGE = `sabueso chomsky-normal-form ${GRAMMAR_OPTION} <grammar> | ${GRAMMAR_FILE_OPTION} <path> [${UNTIL_OPTION} ${STEP_NAMES.join('|')}]`;

export const chomskyNormalFormCommand: Command = {
  name: 'chomsky-normal-form',
  description: `Convert a grammar to Chomsky normal form step by step (${STEP_NAMES.join(', ')})`,
  usage: CHOMSKY_NORMAL_FORM_USAGE,
  async run({ commandArguments, environment }) {
    const parsed = parseArguments({
      commandArguments,
      rules: {
        flags: [],
        valueOptions: [GRAMMAR_OPTION, GRAMMAR_FILE_OPTION, UNTIL_OPTION],
      },
    });
    if (typeof parsed === 'string') {
      return reportUsageError({ message: parsed, environment });
    }
    const source = resolveGrammarOption({ parsed, usage: CHOMSKY_NORMAL_FORM_USAGE });
    if (typeof source === 'string') {
      return reportUsageError({ message: source, environment });
    }
    if (parsed.positionals.length > 0) {
      return reportUsageError({ message: `Usage: ${CHOMSKY_NORMAL_FORM_USAGE}`, environment });
    }
    const until = (parsed.values.get(UNTIL_OPTION) ?? STEP_NAMES.at(-1) ?? '').toUpperCase();
    const lastStep = STEP_NAMES.findIndex((name) => name === until);
    if (lastStep === -1) {
      return reportUsageError({
        message: `${UNTIL_OPTION} must be one of: ${STEP_NAMES.join(', ')}`,
        environment,
      });
    }
    const grammar = await readGrammar({ source, environment });
    const sections = [`${grammar.name}: conversion to Chomsky normal form`];
    let current = grammar;
    CHOMSKY_NORMAL_FORM_STEPS.slice(0, lastStep + 1).forEach((step, index) => {
      const next = step.apply(current);
      sections.push(formatStep({ number: index + 1, step, before: current, after: next }));
      current = next;
    });
    if (lastStep === STEP_NAMES.length - 1) {
      sections.push(formatVerdict(current));
    }
    environment.writeOutput(`${sections.join('\n\n')}\n`);
    return EXIT_CODES.ok;
  },
};

/** The title of the step, the productions it added and removed, and the grammar it left. */
function formatStep({
  number,
  step,
  before,
  after,
}: {
  number: number;
  step: ChomskyNormalFormStep;
  before: Grammar;
  after: Grammar;
}): string {
  const description = STEP_DESCRIPTIONS[step.name];
  const title = `Step ${number} · ${step.name}: ${description.summary}`;
  if (after === before) {
    return [title, `Nothing to do: ${description.unchangedReason(before)}`].join('\n');
  }
  const added = difference({ productions: after.productions, others: before.productions });
  const removed = difference({ productions: before.productions, others: after.productions });
  return [
    title,
    formatChanges({ title: 'Added', mark: '+', productions: added }),
    formatChanges({ title: 'Removed', mark: '-', productions: removed }),
    `After ${step.name} (${countProductions(after.productions.length)}):`,
    formatGrammar(after),
  ].join('\n');
}

/**
 * 'Chomsky normal form ✓ (n productions)', checked again on the result; if some production
 * broke the form, ✗ and the list (it would be a bug in one of the steps).
 */
function formatVerdict(grammar: Grammar): string {
  const outside = productionsOutsideChomskyNormalForm(grammar);
  if (outside.length === 0) {
    return `Chomsky normal form ✓ (${countProductions(grammar.productions.length)})`;
  }
  return [
    `Chomsky normal form ✗ (${countProductions(outside.length)} break it):`,
    ...outside.map((production) => `  ${formatProduction(production)}`),
  ].join('\n');
}

/** 'Added (2):' and one '+ A → α' per production, or 'Added: none'. */
function formatChanges({
  title,
  mark,
  productions,
}: {
  title: string;
  mark: string;
  productions: readonly Production[];
}): string {
  if (productions.length === 0) {
    return `${title}: none`;
  }
  return [
    `${title} (${productions.length}):`,
    ...productions.map((production) => `  ${mark} ${formatProduction(production)}`),
  ].join('\n');
}

/** The productions of the first list that the second one does not have, compared by symbols. */
function difference({
  productions,
  others,
}: {
  productions: readonly Production[];
  others: readonly Production[];
}): Production[] {
  const otherKeys = new Set(others.map(productionKey));
  return productions.filter((production) => !otherKeys.has(productionKey(production)));
}

/** '1 production', '0 productions', '78 productions'. */
function countProductions(count: number): string {
  return `${String(count)} ${count === 1 ? 'production' : 'productions'}`;
}
