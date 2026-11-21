/** One step of the derivation: ⇒ the form, and the production used. A click selects it. */
import type { DerivationStep } from '@sabueso/core';
import { cx } from '../../utils/cx';
import { SententialForm } from './SententialForm';

export function DerivationStepItem({
  number,
  step,
  replacedIndex,
  isSelected,
  onSelect,
}: {
  number: number;
  step: DerivationStep;
  replacedIndex: number | null;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        aria-current={isSelected || undefined}
        onClick={onSelect}
        className={cx(
          'flex w-full items-baseline gap-2 rounded px-2 py-1 text-left text-xs',
          isSelected
            ? 'bg-indigo-50 dark:bg-indigo-950'
            : 'hover:bg-slate-50 dark:hover:bg-slate-900',
        )}
      >
        <span className="w-6 shrink-0 text-right text-slate-400">{number}</span>
        <span className="text-slate-400">{number === 0 ? '' : '⇒'}</span>
        <SententialForm symbols={step.form} replacedIndex={replacedIndex} />
      </button>
    </li>
  );
}
