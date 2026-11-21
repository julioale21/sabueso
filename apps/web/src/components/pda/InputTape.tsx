/** The story as a tape: the tags already read in gray, the next one marked. */
import { cx } from '../../utils/cx';

export function InputTape({ tokens, position }: { tokens: readonly string[]; position: number }) {
  return (
    <div>
      <p className="mb-1 text-xs text-slate-500">Entrada</p>
      <ol aria-label="Entrada" className="flex flex-wrap gap-1">
        {tokens.map((token, index) => (
          <li
            key={index}
            aria-current={index === position || undefined}
            className={cx(
              'rounded border px-1.5 py-0.5 font-mono text-xs',
              index < position &&
                'border-slate-200 text-slate-400 line-through dark:border-slate-800',
              index === position && 'border-amber-400 ring-2 ring-amber-300',
              index > position && 'border-slate-300 dark:border-slate-700',
            )}
          >
            {token}
          </li>
        ))}
        {position >= tokens.length && (
          <li className="px-1.5 py-0.5 text-xs text-slate-500">todo leído</li>
        )}
      </ol>
    </div>
  );
}
