/** A titled section of the page: the boxes of the layout in SPEC 03, section 3.1. */
import type { ReactNode } from 'react';
import { cx } from '../../utils/cx';

export function Panel({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className={cx('rounded-lg border border-slate-200 p-4 dark:border-slate-800', className)}
    >
      <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</h2>
      {children}
    </section>
  );
}
