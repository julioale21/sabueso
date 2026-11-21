/**
 * The analysis of the active grammar at a glance (SPEC 03, section 3.5): whether it is LL(1)
 * (so unambiguous), and how many nullable and useless symbols and cycles it has. Concepts:
 * cards 06 to 10.
 */
import type { GrammarAnalysis } from '@sabueso/core';
import { Badge } from '../ui/Badge';
import { Ll1Badge } from './Ll1Badge';

export function GrammarSummary({ analysis }: { analysis: GrammarAnalysis }) {
  const conflicts = analysis.predictiveTable.conflicts.length;
  return (
    <ul aria-label="Resumen del análisis" className="flex flex-wrap gap-1.5">
      <li>
        <Ll1Badge conflicts={conflicts} />
      </li>
      <SummaryItem label="anulables" value={analysis.nullableSymbols.size} />
      <SummaryItem label="inútiles" value={analysis.useless.size} />
      <SummaryItem label="ciclos" value={analysis.cycles.length} />
      {analysis.isEmpty && (
        <li>
          <Badge tone="danger">L(G) = ∅</Badge>
        </li>
      )}
    </ul>
  );
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <li>
      <Badge>
        {label}: {value}
      </Badge>
    </li>
  );
}
