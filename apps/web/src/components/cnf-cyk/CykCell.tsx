/** One cell T[i][l]: the nonterminals that derive those l tags, or ∅. */
import { cx } from '../../utils/cx';

export function CykCell({ symbols, isGoal }: { symbols: readonly string[]; isGoal: boolean }) {
  return (
    <td
      data-goal={isGoal || undefined}
      className={cx(
        'max-w-[10rem] min-w-[4rem] border border-slate-200 px-1.5 py-1 align-top font-mono text-[11px] leading-tight dark:border-slate-700',
        symbols.length === 0 && 'text-slate-300 dark:text-slate-600',
        isGoal && 'ring-2 ring-inset ring-indigo-400',
      )}
    >
      {symbols.length === 0 ? '∅' : symbols.join(', ')}
    </td>
  );
}
