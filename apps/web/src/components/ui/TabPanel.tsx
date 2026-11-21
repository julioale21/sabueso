/** The content of the selected tab, linked to its tab for screen readers. */
import type { ReactNode } from 'react';

export function TabPanel({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div role="tabpanel" id={`panel-${id}`} aria-labelledby={`tab-${id}`} className="py-4">
      {children}
    </div>
  );
}
