/**
 * Why a story was rejected (SPEC 03, section 3.1): the sequence with the error marked, and the
 * position and the expected tags, as the core diagnoses them. Concept: acceptance and errors
 * (card 17).
 */
import type { ParseError } from '@sabueso/core';
import { diagnosticMessage } from '../../domain/diagnostic-message';
import { cx } from '../../utils/cx';
import { DiagnosticToken } from './DiagnosticToken';

export function DiagnosticPanel({
  tokens,
  error,
}: {
  tokens: readonly string[];
  error: ParseError;
}) {
  const atEnd = error.kind === 'unexpected-end';
  return (
    <div className="space-y-2">
      <ol aria-label="Relato con el error marcado" className="flex flex-wrap gap-1">
        {tokens.length === 0 && (
          <li className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">
            ε (relato vacío)
          </li>
        )}
        {tokens.map((token, index) => (
          <DiagnosticToken key={index} token={token} isError={!atEnd && index === error.position} />
        ))}
        {atEnd && (
          <li className={cx('rounded px-1.5 py-0.5 text-xs', 'bg-red-600 text-white')}>fin</li>
        )}
      </ol>
      <p className="text-sm text-red-700 dark:text-red-400">{diagnosticMessage(error)}</p>
    </div>
  );
}
