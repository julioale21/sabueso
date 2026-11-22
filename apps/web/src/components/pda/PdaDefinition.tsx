/** P = ({q}, Σ, Γ, δ, q, S), with the size of each part (guide 26, Hopcroft 6.3.1). */
import type { PushdownAutomaton } from '@sabueso/core';

export function PdaDefinition({ automaton }: { automaton: PushdownAutomaton }) {
  const expands = automaton.transitions.filter((each) => each.kind === 'expand').length;
  const matches = automaton.transitions.length - expands;
  return (
    <div className="space-y-0.5 text-sm">
      <p className="font-mono">
        P = ({'{q}'}, Σ, Γ, δ, q, {automaton.startStack}), acepta por pila vacía
      </p>
      <p className="text-xs text-slate-600 dark:text-slate-400">
        |Σ| = {automaton.inputAlphabet.size} etiquetas · |Γ| = {automaton.stackAlphabet.size} (N ∪
        Σ) · |δ| = {automaton.transitions.length} ({expands} expandir, {matches} emparejar)
      </p>
    </div>
  );
}
