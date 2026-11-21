/** Secondary text: notices, placeholders and "loading…". */
import type { ReactNode } from 'react';

export function MutedText({ children }: { children: ReactNode }) {
  return <p className="text-sm text-slate-500 dark:text-slate-400">{children}</p>;
}
