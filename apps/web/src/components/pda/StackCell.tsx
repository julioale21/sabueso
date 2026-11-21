/** One symbol of the stack: nonterminals in indigo, terminals dark, like the tree nodes. */
import { cx } from '../../utils/cx';

const kindStyles = {
  nonterminal:
    'border-indigo-200 bg-indigo-50 text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-200',
  terminal:
    'border-slate-800 bg-slate-800 text-white dark:border-slate-200 dark:bg-slate-200 dark:text-slate-900',
};

export function StackCell({
  symbol,
  kind,
  isNew,
}: {
  symbol: string;
  kind: keyof typeof kindStyles;
  /** Pushed by the current step: it slides in. */
  isNew: boolean;
}) {
  return (
    <li
      data-new={isNew || undefined}
      className={cx(
        'rounded border px-2 py-0.5 text-center font-mono text-xs',
        kindStyles[kind],
        isNew && 'motion-safe:animate-push-in ring-2 ring-amber-400',
      )}
    >
      {symbol}
    </li>
  );
}
