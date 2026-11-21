/** One sentential form, with the nonterminal that the next step replaces highlighted. */
import { Fragment } from 'react';
import { cx } from '../../utils/cx';

export function SententialForm({
  symbols,
  replacedIndex,
}: {
  symbols: readonly string[];
  /** Where the replaced nonterminal is, or null. */
  replacedIndex: number | null;
}) {
  if (symbols.length === 0) {
    return <span className="text-slate-400">ε</span>;
  }
  return (
    <span className="font-mono">
      {symbols.map((symbol, index) => (
        <Fragment key={index}>
          {index > 0 && ' '}
          <span
            className={cx(
              index === replacedIndex && 'rounded bg-amber-200 px-0.5 dark:bg-amber-900',
            )}
          >
            {symbol}
          </span>
        </Fragment>
      ))}
    </span>
  );
}
