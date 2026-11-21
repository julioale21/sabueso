/**
 * The stack drawn as a column, top up. Each cell is keyed by its depth from the bottom, so the
 * cells that stay do not move and only the pushed ones slide in.
 */
import { StackCell } from './StackCell';

export function StackView({
  stack,
  terminals,
  pushed,
}: {
  /** Top first, as the core gives it. */
  stack: readonly string[];
  terminals: ReadonlySet<string>;
  /** How many symbols on top the current step pushed. */
  pushed: number;
}) {
  return (
    <div className="w-48 shrink-0">
      <p className="mb-1 text-xs text-slate-500">Pila (tope arriba)</p>
      <ol
        aria-label="Pila"
        className="flex min-h-24 flex-col gap-1 border-x-2 border-b-2 border-slate-300 p-1.5 dark:border-slate-700"
      >
        {stack.length === 0 && <li className="text-center text-xs text-slate-400">vacía (ε)</li>}
        {stack.map((symbol, index) => (
          <StackCell
            key={stack.length - index}
            symbol={symbol}
            kind={terminals.has(symbol) ? 'terminal' : 'nonterminal'}
            isNew={index < pushed}
          />
        ))}
      </ol>
    </div>
  );
}
