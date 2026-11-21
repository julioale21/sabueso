/** One step of the conversion: what it does, how many productions it left, and the changes. */
import type { StepChanges } from '../../domain/normal-form';

export function NormalFormStep({
  number,
  name,
  description,
  productionCount,
  changes,
}: {
  number: number;
  name: string;
  description: string;
  productionCount: number;
  changes: StepChanges;
}) {
  const unchanged = changes.added.length === 0 && changes.removed.length === 0;
  return (
    <li className="rounded border border-slate-200 p-2 text-sm dark:border-slate-800">
      <details>
        <summary className="cursor-pointer">
          <strong>
            {number}. {name}
          </strong>{' '}
          <span className="text-slate-600 dark:text-slate-400">{description}</span>{' '}
          <span className="text-xs text-slate-500">
            · {unchanged ? 'sin cambios' : `+${changes.added.length} −${changes.removed.length}`} ·{' '}
            {productionCount} producciones
          </span>
        </summary>
        <ul className="mt-2 space-y-0.5 font-mono text-xs">
          {changes.added.map((text) => (
            <li key={`+${text}`} className="text-emerald-700 dark:text-emerald-400">
              + {text}
            </li>
          ))}
          {changes.removed.map((text) => (
            <li key={`-${text}`} className="text-red-700 line-through dark:text-red-400">
              − {text}
            </li>
          ))}
        </ul>
      </details>
    </li>
  );
}
