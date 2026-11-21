/** One transition of δ, marked when the accepting path uses it. */
import { cx } from '../../utils/cx';

export function TransitionItem({
  number,
  text,
  isUsed,
}: {
  number: number;
  text: string;
  isUsed: boolean;
}) {
  return (
    <li
      data-used={isUsed || undefined}
      className={cx('font-mono text-xs', isUsed ? 'font-semibold' : 'text-slate-500')}
    >
      <span className="inline-block w-8 text-right text-slate-400">({number})</span> {text}
      {isUsed && <span className="ml-2 font-sans text-[10px] text-indigo-600">usada</span>}
    </li>
  );
}
