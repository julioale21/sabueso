/**
 * The triangular CYK table (card 23): row l has the cells T[0][l] … T[n−l][l], under the tag
 * where each substring starts. The top cell, T[0][n], decides: it must contain the start symbol.
 */
import { CykCell } from './CykCell';

export function CykTable({
  table,
  tokens,
}: {
  table: readonly (readonly ReadonlySet<string>[])[];
  tokens: readonly string[];
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
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
