/** One Earley set Sj: its items, in the order they were added (guide 13). */
import type { ChartEntry } from '../../domain/earley-events';
import { cx } from '../../utils/cx';
import { ChartItem } from './ChartItem';

export function EarleySetColumn({
  index,
  token,
  entries,
  currentEvent,
  isActive,
}: {
  index: number;
  /** The tag read to reach this set, or null for S0. */
  token: string | null;
  entries: readonly ChartEntry[];
  currentEvent: number;
  /** The set the current event belongs to. */
  isActive: boolean;
}) {
  return (
    <section
      aria-label={`S${index}`}
      className={cx(
        'w-64 shrink-0 rounded-lg border p-2',
        isActive
          ? 'border-indigo-400 dark:border-indigo-500'
          : 'border-slate-200 dark:border-slate-800',
      )}
    >
      <h3 className="mb-1 flex items-baseline justify-between text-xs font-semibold">
        <span>S{index}</span>
        <span className="font-normal text-slate-500">
          {token === null ? 'inicio' : `después de ${token}`} · {entries.length} ítems
        </span>
      </h3>
      <ol className="space-y-0.5">
        {entries.map((entry) => (
          <ChartItem key={entry.event} entry={entry} isCurrent={entry.event === currentEvent} />
        ))}
      </ol>
    </section>
  );
}
