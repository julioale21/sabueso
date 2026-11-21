/**
 * Where the structure broke: the Earley items still open in the set of the error. A rejected
 * story has no tree, so this shows which parts had started and what could have come next.
 * The core computes them (openItemsAt); this only draws them.
 */
import type { OpenItems as OpenItemsData } from '@sabueso/core';
import { OpenItemList } from './OpenItemList';

export function OpenItems({ open }: { open: OpenItemsData }) {
  return (
    <div className="space-y-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-900">
      <p className="text-xs text-slate-600 dark:text-slate-400">
        Los ítems de Earley abiertos en S{open.set}, donde falló el relato:
      </p>
      <OpenItemList title="Estructuras empezadas que no pudieron seguir" items={open.started} />
      <OpenItemList
        title="Reglas que esperaban una de las etiquetas válidas"
        items={open.waiting}
      />
    </div>
  );
}
