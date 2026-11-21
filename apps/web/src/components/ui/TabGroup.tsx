/** A titled run of tabs inside the side bar: "Sobre el relato", "Sobre la gramática". */
import type { ReactNode } from 'react';

export function TabGroup({ title, children }: { title: string | undefined; children: ReactNode }) {
  return (
    <div role="group" aria-label={title}>
      {title !== undefined && (
        <p
          aria-hidden="true"
          className="mb-1 px-3 text-[11px] font-semibold tracking-wide text-slate-400 uppercase"
        >
          {title}
        </p>
      )}
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}
