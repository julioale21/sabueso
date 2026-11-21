/**
 * The leftmost derivation, one sentential form per step (SPEC 03, section 3.4). Selecting a
 * step highlights the nonterminal it replaced and, in the tree, the node it expanded.
 * Concept: leftmost derivation (card 20).
 */
import type { DerivationStep } from '@sabueso/core';
import { leftmostNonterminal } from '../../domain/derivation';
import { DerivationStepItem } from './DerivationStepItem';

export function DerivationView({
  derivation,
  alphabet,
  selectedStep,
  onSelectStep,
}: {
  derivation: readonly DerivationStep[];
  alphabet: ReadonlySet<string>;
  /** The selected step (1 is the first production), or null. */
  selectedStep: number | null;
  onSelectStep: (step: number) => void;
}) {
  return (
    <ol aria-label="Derivación más a la izquierda" className="max-h-80 space-y-0.5 overflow-y-auto">
      {derivation.map((step, index) => {
        // Step k replaces the leftmost nonterminal of form k − 1: mark it on that form.
        const next = derivation[index + 1];
        return (
          <DerivationStepItem
            key={index}
            number={index}
            step={step}
            replacedIndex={
              next !== undefined && index + 1 === selectedStep
                ? leftmostNonterminal({ form: step.form, alphabet })
                : null
            }
            isSelected={index === selectedStep}
            onSelect={() => {
              onSelectStep(index);
            }}
          />
        );
      })}
    </ol>
  );
}
