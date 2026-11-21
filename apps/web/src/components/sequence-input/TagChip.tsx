/** One word of the story: a known tag, or an unknown one marked in red. */
import { cx } from '../../utils/cx';

const chipStyles = {
  base: 'rounded px-1.5 py-0.5 font-mono text-xs',
  known: 'bg-slate-100 dark:bg-slate-800',
  unknown: 'bg-red-100 text-red-800 line-through dark:bg-red-950 dark:text-red-300',
};

export function TagChip({ word, isKnown }: { word: string; isKnown: boolean }) {
  return (
    <li
      data-unknown={!isKnown || undefined}
      className={cx(chipStyles.base, isKnown ? chipStyles.known : chipStyles.unknown)}
    >
      {word}
    </li>
  );
}
