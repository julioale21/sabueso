/**
 * The accepting path as a table of instantaneous descriptions, from (q, w, S) to (q, ε, ε).
 * The stack is the part of the leftmost derivation still to derive (card 24).
 */
import type { PathStep, PushdownAutomaton } from '@sabueso/core';
import { inputLeft, stackText, stepTransitionText } from '../../domain/pushdown';
import { PathStepRow } from './PathStepRow';

export function AcceptingPathTable({
  path,
  tokens,
  automaton,
  currentStep,
  onSelectStep,
}: {
  path: readonly PathStep[];
  tokens: readonly string[];
  automaton: PushdownAutomaton;
  currentStep: number;
  onSelectStep: (step: number) => void;
}) {
  const expands = path.filter((step) => step.via?.kind === 'expand').length;
  const matches = path.filter((step) => step.via?.kind === 'match').length;
  return (
    <div className="space-y-1">
      <p className="text-xs text-slate-600 dark:text-slate-400">
        Camino de aceptación: {path.length - 1} transiciones ({expands} expandir, {matches}{' '}
        emparejar). La pila se lee con el tope a la izquierda.
      </p>
      <div className="overflow-x-auto">
        <table aria-label="Camino de aceptación" className="font-mono text-xs">
          <thead>
            <tr className="text-left font-sans text-slate-500">
              <th className="px-2 py-1 text-right font-medium">Paso</th>
              <th className="px-2 py-1 font-medium">Entrada que falta</th>
              <th className="px-2 py-1 font-medium">Pila</th>
              <th className="px-2 py-1 font-medium">Transición</th>
            </tr>
          </thead>
          <tbody>
            {path.map((step, index) => (
              <PathStepRow
                key={index}
                number={index}
                input={inputLeft({ tokens, position: step.id.position })}
                stack={stackText(step.id.stack)}
                transition={stepTransitionText({ automaton, transition: step.via })}
                kind={step.via?.kind ?? 'start'}
                isCurrent={index === currentStep}
                onSelect={() => onSelectStep(index)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
