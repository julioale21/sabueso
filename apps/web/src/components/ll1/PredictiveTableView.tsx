/**
 * The LL(1) predictive table M[A, a]: a row per nonterminal, a column per terminal and $.
 * A cell with two or more productions is a conflict (guide 12).
 */
import type { PredictiveTable } from '@sabueso/core';
import { PredictiveCell } from './PredictiveCell';

export function PredictiveTableView({
  table,
  nonterminals,
  terminals,
}: {
  table: PredictiveTable;
  nonterminals: readonly string[];
  /** The columns: Σ and $. */
  terminals: readonly string[];
}) {
  return (
    <div className="overflow-x-auto">
      <table
        aria-label="Tabla predictiva M[A, a]"
        className="border-collapse font-mono text-[11px]"
      >
        <thead>
          <tr>
            <th className="px-1.5 py-1 text-left font-sans text-slate-500">M[A, a]</th>
            {terminals.map((terminal) => (
              <th key={terminal} scope="col" className="px-1.5 py-1 font-semibold">
                {terminal}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {nonterminals.map((nonterminal) => (
            <tr key={nonterminal}>
              <th
                scope="row"
                className="px-1.5 py-1 text-left font-medium text-indigo-700 dark:text-indigo-300"
              >
                {nonterminal}
              </th>
              {terminals.map((terminal) => (
                <PredictiveCell
                  key={terminal}
                  productions={table.table.get(nonterminal)?.get(terminal) ?? []}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
