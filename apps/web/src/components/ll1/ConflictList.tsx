/** Each conflict in words: the cell and the productions that compete for it. */
import type { PredictiveTableConflict } from '@sabueso/core';
import { productionText } from '../../domain/productions';

export function ConflictList({ conflicts }: { conflicts: readonly PredictiveTableConflict[] }) {
  if (conflicts.length === 0) {
    return null;
  }
  return (
    <ul
      aria-label="Conflictos"
      className="space-y-0.5 font-mono text-xs text-red-800 dark:text-red-300"
    >
      {conflicts.map((conflict) => (
        <li key={`${conflict.nonterminal}-${conflict.lookahead}`}>
          M[{conflict.nonterminal}, {conflict.lookahead}]:{' '}
          {conflict.productions.map(productionText).join('  ·  ')}
        </li>
      ))}
    </ul>
  );
}
