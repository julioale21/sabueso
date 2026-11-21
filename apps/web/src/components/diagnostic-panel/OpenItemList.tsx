/** One group of open Earley items, with a title that says what they mean. */
import type { OpenItem } from '../../domain/open-items';

export function OpenItemList({ title, items }: { title: string; items: readonly OpenItem[] }) {
  if (items.length === 0) {
    return null;
  }
  return (
    <section aria-label={title}>
      <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400">{title}</h4>
      <ul className="mt-1 space-y-0.5 font-mono text-xs">
        {items.map((item) => (
          <li key={item.text}>{item.text}</li>
        ))}
      </ul>
    </section>
  );
}
