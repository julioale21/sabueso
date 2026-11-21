/** One instantaneous description of the path: (q, input left, stack), and how it got there. Click to jump to it. */
import { cx } from '../../utils/cx';

const kindStyles = {
  start: 'text-slate-500',
  expand: '',
  match: 'font-semibold text-emerald-700 dark:text-emerald-400',
};

export function PathStepRow({
  number,
  input,
  stack,
  transition,
  kind,
  isCurrent,
  onSelect,
}: {
  number: number;
  input: string;
  stack: string;
  transition: string;
  kind: keyof typeof kindStyles;
  isCurrent: boolean;
  onSelect: () => void;
}) {
  return (
    <tr
      aria-current={isCurrent || undefined}
      onClick={onSelect}
      className={cx(
        'cursor-pointer border-t border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900',
        isCurrent && 'bg-amber-50 dark:bg-amber-950',
      )}
    >
      <td className="px-2 py-0.5 text-right text-slate-500">{number}</td>
      <td className="px-2 py-0.5 whitespace-nowrap">{input}</td>
      <td className="px-2 py-0.5 whitespace-nowrap">{stack}</td>
      <td className={cx('px-2 py-0.5 whitespace-nowrap', kindStyles[kind])}>{transition}</td>
    </tr>
  );
}
