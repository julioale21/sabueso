/** A short label with a meaning in its color: good, bad or just informative. */
import type { ReactNode } from 'react';
import { cx } from '../../utils/cx';

const tones = {
  success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  danger: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

export function Badge({
  tone = 'neutral',
  title,
  children,
}: {
  tone?: keyof typeof tones;
  /** A longer explanation, shown on hover. */
  title?: string;
  children: ReactNode;
}) {
  return (
    <span title={title} className={cx('rounded px-2 py-0.5 text-xs font-medium', tones[tone])}>
      {children}
    </span>
  );
}
