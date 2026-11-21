/** One event of a rejected story; the one where the error is, marked. */
import { cx } from '../../utils/cx';

const tokenStyles = {
  base: 'rounded px-1.5 py-0.5 font-mono text-xs',
  normal: 'bg-slate-100 dark:bg-slate-800',
  error: 'bg-red-600 text-white ring-2 ring-red-300 dark:ring-red-800',
};

export function DiagnosticToken({ token, isError }: { token: string; isError: boolean }) {
  return (
    <li
      aria-current={isError || undefined}
      className={cx(tokenStyles.base, isError ? tokenStyles.error : tokenStyles.normal)}
    >
      {token}
    </li>
  );
}
