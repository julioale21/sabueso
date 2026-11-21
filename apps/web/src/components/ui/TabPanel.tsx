/** The content of the selected tab, linked to its tab for screen readers. */
import type { ReactNode } from 'react';

export function TabPanel({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div
      role="tabpanel"
      id={`panel-${id}`}
      aria-labelledby={`tab-${id}`}
      className="min-w-0 flex-1 py-4 md:py-0"
    >
      {children}
    </div>
  );
}
