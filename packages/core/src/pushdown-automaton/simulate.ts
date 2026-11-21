/**
 * Concept: running a nondeterministic pushdown automaton: a breadth-first search over its
 * instantaneous descriptions, with the configurations already seen skipped, the ones that
 * need more tokens than are left pruned (minYield), and a step limit.
 * Card: docs/concepts/24-pushdown-automaton.md
 */
import { computeMinYield, minYieldOfSequence } from '../analysis/min-yield.js';
import type { Grammar, SymbolName } from '../grammar/types.js';
import { buildPushdownAutomaton, type PushdownTransition } from './build.js';

/** By default the search gives up after this many configurations: 'undetermined'. */
export const DEFAULT_MAX_STEPS = 200_000;

/**
 * An instantaneous description (q, w, γ) without q, which never changes: how many tokens
 * were read and the stack, top first (index 0).
 */
export interface InstantaneousDescription {
  position: number;
  stack: SymbolName[];
}

/** One step of a path: the description reached, and the transition that reached it. */
export interface PathStep {
  id: InstantaneousDescription;
  /** null for the starting description. */
  via: PushdownTransition | null;
}

/** The result of the search, how many configurations it explored, and the accepting path. */
export interface PushdownRun {
  /** accept: empty stack after the whole input; reject: no branch can; undetermined: limit. */
  result: 'accept' | 'reject' | 'undetermined';
  /** How many configurations the search took out of its queue. */
  steps: number;
  /** From (0, S) to (n, ε), when it accepts; null otherwise. */
  acceptingPath: PathStep[] | null;
}

/** A configuration in the queue, with a link back to the one it came from. */
interface SearchNode extends PathStep {
  parent: SearchNode | null;
}

/**
 * Runs the pushdown automaton of the grammar on the tokens, exploring every choice of
 * production in breadth-first order until one branch empties the stack at the end of the
 * input. Breadth first finds the shortest accepting path.
 */
export function simulatePushdownAutomaton({
  grammar,
  tokens,
  maxSteps = DEFAULT_MAX_STEPS,
}: {
  grammar: Grammar;
  tokens: readonly SymbolName[];
  /** The most configurations to explore before answering 'undetermined'. */
  maxSteps?: number | undefined;
}): PushdownRun {
  // The automaton is nondeterministic: with A on top it can use any A → β. Instead of
  // guessing, the search keeps every branch in a queue. Three things keep it finite:
  // - visited: the same (position, stack) is never explored twice (cycles A ⇒+ A);
  // - minYield: a stack that needs more tokens than are left can never accept;
  // - maxSteps: a stack that grows without needing tokens (A → A B, B ⇒* ε) stops here.
  const automaton = buildPushdownAutomaton(grammar);
  const minYield = computeMinYield(grammar);
  const start: SearchNode = {
    id: { position: 0, stack: [automaton.startStack] },
    via: null,
    parent: null,
  };
  const queue: SearchNode[] = [start];
  const visited = new Set([configurationKey(start.id)]);
  let steps = 0;
  for (let next = 0; next < queue.length; next++) {
    if (steps >= maxSteps) {
      return { result: 'undetermined', steps, acceptingPath: null };
    }
    const node = queue[next];
    if (node === undefined) {
      break;
    }
    steps++;
    if (node.id.stack.length === 0 && node.id.position === tokens.length) {
      return { result: 'accept', steps, acceptingPath: pathTo(node) };
    }
    for (const successor of successors({ node, transitions: automaton.transitions, tokens })) {
      const key = configurationKey(successor.id);
      const remaining = tokens.length - successor.id.position;
      if (
        !visited.has(key) &&
        minYieldOfSequence({ symbols: successor.id.stack, minYield }) <= remaining
      ) {
        visited.add(key);
        queue.push(successor);
      }
    }
  }
  return { result: 'reject', steps, acceptingPath: null };
}

/**
 * The configurations one transition away: with a nonterminal A on top, one per A → β
 * (expand); with a terminal a on top, one if the next token is a (match); none if empty.
 */
function successors({
  node,
  transitions,
  tokens,
}: {
  node: SearchNode;
  /** δ, the transitions of the automaton. */
  transitions: readonly PushdownTransition[];
  tokens: readonly SymbolName[];
}): SearchNode[] {
  const [top, ...rest] = node.id.stack;
  if (top === undefined) {
    return [];
  }
  return transitions
    .filter((transition) =>
      transition.kind === 'expand'
        ? transition.top === top
        : transition.terminal === top && tokens[node.id.position] === top,
    )
    .map((transition) => ({
      id:
        transition.kind === 'expand'
          ? { position: node.id.position, stack: [...transition.push, ...rest] }
          : { position: node.id.position + 1, stack: rest },
      via: transition,
      parent: node,
    }));
}

/** The path from the starting description to this node, following the parent links. */
function pathTo(node: SearchNode): PathStep[] {
  const path: PathStep[] = [];
  for (let current: SearchNode | null = node; current !== null; current = current.parent) {
    path.unshift({ id: current.id, via: current.via });
  }
  return path;
}

/** 'position|A B c': two configurations with the same key are the same configuration. */
function configurationKey(id: InstantaneousDescription): string {
  return `${id.position}|${id.stack.join(' ')}`;
}
