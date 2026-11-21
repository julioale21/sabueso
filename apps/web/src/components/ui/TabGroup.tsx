/** A titled run of tabs inside a tablist; every group after the first has a divider on its left. */
import type { ReactNode } from 'react';
import { cx } from '../../utils/cx';

export function TabGroup({
  title,
  isFirst,
  children,
}: {
  title: string | undefined;
  isFirst: boolean;
  children: ReactNode;
}) {
  return (
    <div
      role="group"
      aria-label={title}
      className={cx(!isFirst && 'border-l border-slate-200 pl-6 dark:border-slate-800')}
    >
      {title !== undefined && (
        <p
          aria-hidden="true"
          className="px-3 text-[11px] font-semibold tracking-wide text-slate-400 uppercase"
        >
          {title}
        </p>
      )}
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}
