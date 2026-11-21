/** The six steps of the conversion to Chomsky normal form, in order (card 22). */
import type { ChomskyNormalFormResult, Grammar } from '@sabueso/core';
import { STEP_DESCRIPTIONS, stepChanges } from '../../domain/normal-form';
import { NormalFormStep } from './NormalFormStep';

export function NormalFormSteps({
  original,
  normalForm,
}: {
  original: Grammar;
  normalForm: ChomskyNormalFormResult;
}) {
  return (
    <ol className="space-y-1.5">
      {normalForm.steps.map((step, index) => (
        <NormalFormStep
          key={step.name}
          number={index + 1}
          name={step.name}
          description={STEP_DESCRIPTIONS[step.name] ?? ''}
          productionCount={step.grammar.productions.length}
          changes={stepChanges({
            before: index === 0 ? original : (normalForm.steps[index - 1]?.grammar ?? original),
            after: step.grammar,
          })}
        />
      ))}
    </ol>
  );
}
