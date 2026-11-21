/** One item of an Earley set: the dotted rule, its origin j and the operation that added it. */
import type { ChartEntry } from '../../domain/earley-events';
import { OPERATION_NAMES } from '../../domain/earley-events';
import { cx } from '../../utils/cx';

const itemStyles = {
  base: 'flex items-baseline justify-between gap-2 rounded px-1.5 py-0.5 font-mono text-[11px]',
  normal: 'text-slate-700 dark:text-slate-300',
  current:
    'bg-amber-100 text-amber-900 ring-1 ring-amber-400 dark:bg-amber-950 dark:text-amber-100',
};

export function ChartItem({ entry, isCurrent }: { entry: ChartEntry; isCurrent: boolean }) {
  return (
    <li
      aria-current={isCurrent || undefined}
      title={OPERATION_NAMES[entry.op]}
      className={cx(itemStyles.base, isCurrent ? itemStyles.current : itemStyles.normal)}
    >
      <span>{entry.rule}</span>
      <span className="shrink-0 text-slate-400">{entry.origin}</span>
    </li>
  );
}
