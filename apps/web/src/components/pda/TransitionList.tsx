/**
 * δ: one expand per production and one match per terminal (Hopcroft 6.3.1). The ones the
 * accepting path uses stand out.
 */
import type { PathStep, PushdownAutomaton } from '@sabueso/core';
import { transitionText } from '../../domain/pushdown';
import { TransitionItem } from './TransitionItem';

export function TransitionList({
  automaton,
  path,
}: {
  automaton: PushdownAutomaton;
  path: readonly PathStep[] | null;
}) {
  const used = new Set(
    (path ?? []).flatMap((step) => (step.via === null ? [] : [transitionText(step.via)])),
  );
  return (
    <details>
      <summary className="cursor-pointer text-sm">
        Transiciones δ ({automaton.transitions.length}
        {path !== null && `, ${used.size} usadas en el camino`})
      </summary>
      <ol className="mt-2 space-y-0.5">
        {automaton.transitions.map((transition, index) => {
          const text = transitionText(transition);
          return <TransitionItem key={text} number={index} text={text} isUsed={used.has(text)} />;
        })}
      </ol>
    </details>
  );
}
