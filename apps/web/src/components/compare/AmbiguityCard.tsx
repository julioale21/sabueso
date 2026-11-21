/**
 * The ambiguity witness of one grammar up to k (card 25): a sentence with two or more trees
 * proves the grammar ambiguous; finding none proves nothing, because ambiguity is undecidable.
 */
import type { AmbiguityWitness } from '@sabueso/core';
import { sentenceText, treeCountText } from '../../domain/bounded';
import { Badge } from '../ui/Badge';

export function AmbiguityCard({
  grammarLabel,
  witness,
  maxLength,
}: {
  grammarLabel: string;
  witness: AmbiguityWitness | null;
  maxLength: number;
}) {
  return (
    <section
      aria-label={`Ambigüedad de ${grammarLabel}`}
      className="space-y-1.5 rounded border border-slate-200 p-3 text-sm dark:border-slate-800"
    >
      <h3 className="font-semibold">{grammarLabel}</h3>
      {witness === null ? (
        <>
          <Badge>sin testigo hasta k = {maxLength}</Badge>
          <p className="text-slate-600 dark:text-slate-400">
            Cada oración de largo ≤ {maxLength} tiene un solo árbol. Esto no demuestra nada para
            oraciones más largas.
          </p>
        </>
      ) : (
        <>
          <Badge tone="danger">ambigua</Badge>
          <p>
            <span className="font-mono">{sentenceText(witness.sentence)}</span> tiene{' '}
            {treeCountText(witness.treeCount)}: la gramática es ambigua.
          </p>
        </>
      )}
    </section>
  );
}
