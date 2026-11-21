/**
 * One cell T[i][l]: the nonterminals that derive those l tags, or ∅. While the table fills by
 * length (SPEC 03, step 18), a row not reached yet is pending and the row being filled stands out.
 */
import { cx } from '../../utils/cx';

export type CykCellState = 'pending' | 'current' | 'done';

const stateStyles: Record<CykCellState, string> = {
  pending: 'bg-slate-50 dark:bg-slate-900',
  current: 'bg-amber-50 motion-safe:animate-node-in dark:bg-amber-950',
  done: '',
};

export function CykCell({
  symbols,
  isGoal,
  state = 'done',
}: {
  symbols: readonly string[];
  isGoal: boolean;
  state?: CykCellState;
}) {
  return (
    <td
      data-goal={isGoal || undefined}
      data-state={state}
      className={cx(
        'max-w-[10rem] min-w-[4rem] border border-slate-200 px-1.5 py-1 align-top font-mono text-[11px] leading-tight dark:border-slate-700',
        stateStyles[state],
        state !== 'pending' && symbols.length === 0 && 'text-slate-300 dark:text-slate-600',
        isGoal && 'ring-2 ring-inset ring-indigo-400',
      )}
    >
      {state === 'pending' ? '' : symbols.length === 0 ? '∅' : symbols.join(', ')}
    </td>
  );
}
