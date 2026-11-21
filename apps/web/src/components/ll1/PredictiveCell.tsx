/** One cell M[A, a]: empty, one production, or a conflict (more than one) in red. */
import type { Production } from '@sabueso/core';
import { rightSideText } from '../../domain/productions';
import { cx } from '../../utils/cx';

const cellStyles = {
  base: 'max-w-[8rem] min-w-[4.5rem] border border-slate-100 px-1.5 py-1 align-top leading-tight dark:border-slate-800',
  conflict:
    'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300 [&>div+div]:border-t [&>div+div]:border-red-200 dark:[&>div+div]:border-red-900',
};

export function PredictiveCell({ productions }: { productions: readonly Production[] }) {
  const isConflict = productions.length > 1;
  return (
    <td
      data-conflict={isConflict || undefined}
      className={cx(cellStyles.base, isConflict && cellStyles.conflict)}
    >
      {productions.map((production) => (
        <div key={production.id} className="py-0.5">
          {rightSideText(production)}
        </div>
      ))}
    </td>
  );
}
