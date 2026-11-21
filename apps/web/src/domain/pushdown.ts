/**
 * How the pushdown automaton is written on screen (card 24): its transitions, the stack and
 * the input still to read. The automaton and its run come from the core.
 */
import type { PushdownAutomaton, PushdownTransition, SymbolName } from '@sabueso/core';
import { productionText, rightSideText } from './productions';

/** δ(q, ε, A) ∋ (q, β) for an expand, δ(q, a, a) = {(q, ε)} for a match. */
export function transitionText(transition: PushdownTransition): string {
  return transition.kind === 'expand'
    ? `δ(q, ε, ${transition.top}) ∋ (q, ${rightSideText(transition.production)})`
    : `δ(q, ${transition.terminal}, ${transition.terminal}) = {(q, ε)}`;
}

/** The number of an expand in δ: the same as its production in the grammar. */
export function expandNumber({
  automaton,
  transition,
}: {
  automaton: PushdownAutomaton;
  transition: PushdownTransition;
}): number {
  return automaton.transitions.findIndex((each) => sameTransition(each, transition));
}

function sameTransition(first: PushdownTransition, second: PushdownTransition): boolean {
  if (first.kind === 'expand' && second.kind === 'expand') {
    return productionText(first.production) === productionText(second.production);
  }
  return first.kind === 'match' && second.kind === 'match' && first.terminal === second.terminal;
}

/** How a step of the path got there: 'expandir (0) Relato → …', 'emparejar CRI' or the start. */
export function stepTransitionText({
  automaton,
  transition,
}: {
  automaton: PushdownAutomaton;
  transition: PushdownTransition | null;
}): string {
  if (transition === null) {
    return '— (inicio)';
  }
  return transition.kind === 'expand'
    ? `expandir (${expandNumber({ automaton, transition })}) ${productionText(transition.production)}`
    : `emparejar ${transition.terminal}`;
}

/** The stack, top first: 'Planteo Investigacion Desenlace', or ε when empty. */
export function stackText(stack: readonly SymbolName[]): string {
  return stack.length === 0 ? 'ε' : stack.join(' ');
}

/** The tags not read yet, or ε at the end. */
export function inputLeft({
  tokens,
  position,
}: {
  tokens: readonly string[];
  position: number;
}): string {
  return position >= tokens.length ? 'ε' : tokens.slice(position).join(' ');
}

/** What a step did to the stack, in words: what left and what entered. */
export function stackChangeText(transition: PushdownTransition | null): string {
  if (transition === null) {
    return `La pila empieza con el símbolo inicial.`;
  }
  if (transition.kind === 'match') {
    return `Emparejar: sale ${transition.terminal} del tope y se lee ${transition.terminal} de la entrada.`;
  }
  const entered =
    transition.push.length === 0 ? 'no entra nada (ε)' : `entra ${transition.push.join(' ')}`;
  return `Expandir sin leer: sale ${transition.top} del tope y ${entered}.`;
}

/** How many symbols on top of the stack the step pushed: the right side of an expand. */
export function pushedCount(transition: PushdownTransition | null): number {
  return transition?.kind === 'expand' ? transition.push.length : 0;
}
