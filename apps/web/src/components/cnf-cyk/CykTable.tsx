/**
 * The triangular CYK table (guide 25): row l has the cells T[0][l] … T[n−l][l], under the tag
 * where each substring starts. The top cell, T[0][n], decides: it must contain the start symbol.
 */
import { CykCell, type CykCellState } from './CykCell';

/** The state of the cells of a row, given how many lengths are filled. */
function rowState({ length, filled }: { length: number; filled: number }): CykCellState {
  if (length > filled) {
    return 'pending';
  }
  return length === filled ? 'current' : 'done';
}

export function CykTable({
  table,
  tokens,
  filled = tokens.length,
}: {
  table: readonly (readonly ReadonlySet<string>[])[];
  tokens: readonly string[];
  /** How many lengths are filled, from 1 up: rows above are still empty. All, by default. */
  filled?: number;
}) {
  const n = tokens.length;
  const lengths = Array.from({ length: n }, (_, index) => n - index);
  return (
    <div className="overflow-x-auto">
      <table aria-label="Tabla CYK" className="border-collapse text-xs">
        <thead>
          <tr>
            <th className="px-1.5 py-1 text-left font-medium text-slate-500">l \ i</th>
            {tokens.map((token, start) => (
              <th key={start} scope="col" className="px-1.5 py-1 font-mono font-semibold">
                {start}: {token}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lengths.map((length) => (
            <tr key={length}>
              <th scope="row" className="px-1.5 py-1 text-left font-medium text-slate-500">
                l = {length}
              </th>
              {tokens.slice(0, n - length + 1).map((_token, start) => (
                <CykCell
                  key={start}
                  symbols={[...(table[start]?.[length] ?? [])].sort()}
                  isGoal={start === 0 && length === n}
                  state={filled === n ? 'done' : rowState({ length, filled })}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
