/**
 * One group of open Earley items, with a title that says what they mean. Each item is written
 * with the core's label(), the same text the traces and the console use.
 */
import { label, type EarleyItem } from '@sabueso/core';

export function OpenItemList({ title, items }: { title: string; items: readonly EarleyItem[] }) {
  if (items.length === 0) {
    return null;
  }
  return (
    <section aria-label={title}>
      <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400">{title}</h4>
      <ul className="mt-1 space-y-0.5 font-mono text-xs">
        {items.map((item) => (
          <li key={item.key}>{label(item)}</li>
        ))}
      </ul>
    </section>
  );
}
