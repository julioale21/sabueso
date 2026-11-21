/** Accepted or rejected, and how many trees: the answer to "is the story in L(G)?". */
import type { TreeCount } from '@sabueso/core';
import { formatTreeCount, treesWord } from '../../domain/tree-count';
import { cx } from '../../utils/cx';

const bannerStyles = {
  base: 'rounded px-3 py-2 text-sm font-medium',
  accepted: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  rejected: 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300',
};

export function VerdictBanner({
  accepted,
  treeCount,
  treesShown,
}: {
  accepted: boolean;
  treeCount: TreeCount;
  /** How many trees were built and can be browsed. */
  treesShown: number;
}) {
  if (!accepted) {
    return (
      <p role="status" className={cx(bannerStyles.base, bannerStyles.rejected)}>
        ✗ Rechazado: el relato no pertenece al lenguaje de la gramática
      </p>
    );
  }
  const isAmbiguous = treeCount === 'infinite' || treeCount > 1n;
  const shownNote =
    treeCount !== 'infinite' && BigInt(treesShown) === treeCount
      ? ''
      : ` (se muestran ${treesShown})`;
  return (
    <p role="status" className={cx(bannerStyles.base, bannerStyles.accepted)}>
      ✓ Aceptado · {formatTreeCount(treeCount)} {treesWord(treeCount)}
      {shownNote}
      {isAmbiguous && ' · la gramática es ambigua para este relato'}
    </p>
  );
}
